"""Validator for enhancement results.

Runs after `run.py`. Scans every result file in `docs/enhancement-results/`
and flags:
- Parse failures (parseOk: false)
- Year outside 2000–CURRENT_YEAR+1
- `_low_confidence: true`
- References with suspicious titles (contains "NCCN"/"ESMO"/"NCI" — likely
  foreign guideline passed off as domestic)
- Empty result arrays on dimensions where we asked for content
- Fabrication signals: non-whitelist journal name in cn_literature
- DOI format: must start with "10."

Exit code is non-zero if any critical flag fires, so it can gate `merge.py`
in CI / scripts.

Usage:
    python scripts/enhance/validate.py
    python scripts/enhance/validate.py --only-critical
    python scripts/enhance/validate.py --task-ids T0001,T0002
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
RESULTS_DIR = ROOT / "docs" / "enhancement-results"
CURRENT_YEAR = date.today().year

FOREIGN_GUIDELINE_PATTERNS = [
    r"\bNCCN\b",
    r"\bESMO\b",
    r"\bASCO\b",
    r"\bNCI\b",
    r"\bUICC\b",
    r"\bAJCC\b",
    r"\bWHO\b",
]

WHITELIST_JOURNALS = {
    "中华病理学杂志",
    "临床与实验病理学杂志",
    "诊断病理学杂志",
    "中华肿瘤杂志",
    "中国肿瘤临床",
    "中华医学杂志",
    "中国癌症杂志",
    "肿瘤",
}

VALID_CN_ORGS_KEYWORDS = [
    "CSCO", "中国临床肿瘤学会",
    "CACA", "中国抗癌协会",
    "中华医学会",
    "国家卫健委", "国家卫生健康委员会",
    "中国医师协会",
    "中华口腔医学会",  # for oral pathology
    "肿瘤病理分子诊断联盟",
]


@dataclass
class Issue:
    severity: str          # "critical" | "warn" | "info"
    code: str
    message: str


@dataclass
class ResultReport:
    task_id: str
    dimension: str
    parse_ok: bool
    issues: list[Issue] = field(default_factory=list)

    def add(self, severity: str, code: str, message: str) -> None:
        self.issues.append(Issue(severity, code, message))

    def worst_severity(self) -> str | None:
        for sev in ("critical", "warn", "info"):
            if any(i.severity == sev for i in self.issues):
                return sev
        return None


def iter_refs(output: Any, field_names: list[str]):
    """Yield (field_name, item_dict) for any of the given list fields."""
    if not isinstance(output, dict):
        return
    for fn in field_names:
        items = output.get(fn)
        if isinstance(items, list):
            for it in items:
                if isinstance(it, dict):
                    yield fn, it


def check_year(year_val: Any, field_name: str, rep: ResultReport) -> None:
    if year_val is None:
        return
    if not isinstance(year_val, int):
        rep.add("critical", "year-not-int",
                f"{field_name}.year 不是整数: {year_val!r}")
        return
    if year_val < 2000 or year_val > CURRENT_YEAR + 1:
        rep.add("critical", "year-out-of-range",
                f"{field_name}.year={year_val} 超出 2000–{CURRENT_YEAR + 1}")


def check_foreign_leakage(title: str, org: str, field_name: str, rep: ResultReport) -> None:
    """国内指南/共识的 title 不应包含 NCCN/ESMO/NCI 等外国缩写作为主体。"""
    blob = f"{title} {org}"
    for pat in FOREIGN_GUIDELINE_PATTERNS:
        if re.search(pat, blob):
            # Allow WHO/AJCC in summary text but not as primary source
            if pat in [r"\bWHO\b", r"\bAJCC\b"] and field_name != "references_cn_guideline":
                continue
            rep.add("warn", "foreign-guideline-leak",
                    f'{field_name} 疑似将外国指南({pat.strip(r"\\b")})写入国内字段: {title!r}')


def check_org_name(org: Any, field_name: str, rep: ResultReport) -> None:
    if not isinstance(org, str) or not org:
        rep.add("warn", "empty-org", f"{field_name}.org 为空")
        return
    if not any(kw in org for kw in VALID_CN_ORGS_KEYWORDS):
        rep.add("info", "unknown-org",
                f"{field_name}.org={org!r} 不在已知国内机构白名单")


def check_doi(doi: Any, rep: ResultReport) -> None:
    if doi is None:
        return
    if not isinstance(doi, str):
        rep.add("warn", "doi-not-string", f"doi 不是字符串: {doi!r}")
        return
    if not doi.startswith("10."):
        rep.add("warn", "doi-invalid-format", f"doi 格式不对（应以 10. 开头）: {doi}")


def check_journal(journal: Any, rep: ResultReport) -> None:
    if not isinstance(journal, str) or not journal:
        rep.add("warn", "empty-journal", "literature_cn.journal 为空")
        return
    if journal not in WHITELIST_JOURNALS:
        rep.add("info", "journal-not-whitelist",
                f"期刊 {journal!r} 不在核心期刊白名单")


def validate_result(result: dict) -> ResultReport:
    rep = ResultReport(
        task_id=result.get("taskId", "?"),
        dimension=result.get("dimension", "?"),
        parse_ok=bool(result.get("parseOk")),
    )

    if "error" in result:
        rep.add("critical", "runtime-error", result["error"])
        return rep

    if not result.get("parseOk"):
        rep.add("critical", "parse-fail",
                result.get("parseError", "JSON 解析失败"))
        return rep

    output = result.get("output")
    if output is None:
        rep.add("critical", "no-output", "output 字段缺失")
        return rep

    # _low_confidence flag is not fatal but should be surfaced
    if isinstance(output, dict) and output.get("_low_confidence"):
        rep.add("info", "low-confidence",
                f"模型自标低置信: {output.get('_reason', '')}")

    dim = rep.dimension

    # Year + foreign-leak + org checks on guideline / consensus fields
    for field_name, item in iter_refs(
        output,
        ["references_cn_guideline", "references_cn_consensus",
         "expertConsensus_cn"],
    ):
        check_year(item.get("year"), field_name, rep)
        check_org_name(item.get("org") or item.get("organization"),
                       field_name, rep)
        check_foreign_leakage(
            item.get("title", ""),
            item.get("org", "") or item.get("organization", ""),
            field_name, rep,
        )

    # literature_cn: journal + doi + year
    for field_name, item in iter_refs(output, ["literature_cn"]):
        check_year(item.get("year"), field_name, rep)
        check_journal(item.get("journal"), rep)
        check_doi(item.get("doi"), rep)

    # Emptiness checks per dimension (warn if we asked for content but got nothing)
    _check_emptiness(output, dim, rep)

    # Images caption language check
    for field_name, item in iter_refs(output, ["images"]):
        cap = item.get("caption", "")
        if cap and not re.search(r"[\u4e00-\u9fff]", cap):
            rep.add("warn", "caption-not-chinese",
                    f"images.caption 应为中文: {cap[:50]}")

    return rep


def _check_emptiness(output: dict, dim: str, rep: ResultReport) -> None:
    """Flag empty core fields unless _low_confidence justifies it.

    For dimensions where multiple field names are acceptable (e.g.
    cn_consensus accepts EITHER `references_cn_consensus` for disease
    targets OR `expertConsensus_cn` for marker targets), emptiness is only
    flagged when ALL acceptable fields are empty.
    """
    if not isinstance(output, dict):
        return
    # Map dim → list of acceptable field names (any one populated = OK)
    expected_fields = {
        "cn_guideline": ["references_cn_guideline"],
        "cn_consensus": ["references_cn_consensus", "expertConsensus_cn"],
        "cn_literature": ["literature_cn"],
        "images": ["images"],
        "staining_image": ["images"],
        "description_expand": ["microscopy"],
    }
    fields = expected_fields.get(dim)
    if not fields:
        return

    def _empty(v) -> bool:
        return (
            v is None
            or (isinstance(v, list) and not v)
            or (isinstance(v, str) and len(v) < 10)
        )

    if all(_empty(output.get(f)) for f in fields) and not output.get("_low_confidence"):
        rep.add("warn", "empty-core-field",
                f"{dim} 任务的核心字段 ({'/'.join(fields)}) 全部为空，"
                f"但未标 _low_confidence")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only-critical", action="store_true")
    ap.add_argument("--task-ids", help="comma-separated taskId filter")
    ap.add_argument("--json", action="store_true", help="emit JSON report")
    args = ap.parse_args()

    if not RESULTS_DIR.exists():
        print("No results directory yet.", file=sys.stderr)
        return 0

    task_filter = (
        set(s.strip() for s in args.task_ids.split(",")) if args.task_ids else None
    )

    reports: list[ResultReport] = []
    for rf in sorted(RESULTS_DIR.glob("*.json")):
        with rf.open(encoding="utf-8") as f:
            result = json.load(f)
        if task_filter and result.get("taskId") not in task_filter:
            continue
        reports.append(validate_result(result))

    if not reports:
        print("No results to validate.", file=sys.stderr)
        return 0

    critical = sum(1 for r in reports if any(i.severity == "critical" for i in r.issues))
    warn = sum(1 for r in reports if any(i.severity == "warn" for i in r.issues))
    info = sum(1 for r in reports if any(i.severity == "info" for i in r.issues))
    clean = sum(1 for r in reports if not r.issues)

    if args.json:
        print(json.dumps(
            [{"taskId": r.task_id, "dimension": r.dimension,
              "parseOk": r.parse_ok,
              "issues": [{"severity": i.severity, "code": i.code, "message": i.message}
                         for i in r.issues]}
             for r in reports],
            ensure_ascii=False, indent=2,
        ))
    else:
        for r in reports:
            issues = r.issues
            if args.only_critical:
                issues = [i for i in issues if i.severity == "critical"]
            if not issues:
                continue
            print(f"\n{r.task_id} [{r.dimension}]")
            for i in issues:
                marker = {"critical": "✗", "warn": "⚠", "info": "·"}[i.severity]
                print(f"  {marker} [{i.severity}] {i.code}: {i.message}")

        print(
            f"\nSummary: {len(reports)} results | "
            f"clean={clean} critical={critical} warn={warn} info={info}",
            file=sys.stderr,
        )

    return 1 if critical > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
