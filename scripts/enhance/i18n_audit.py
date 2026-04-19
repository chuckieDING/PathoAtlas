"""i18n / English-coverage auditor.

Walks data/ and finds entries that have a Chinese name/title/term but a
missing or empty English equivalent. Common pairs:
  - nameZh / nameEn
  - titleZh / titleEn
  - termZh / termEn

Output:
  - docs/i18n-audit.md   per-file table of missing English values
  - docs/i18n-audit.json machine-readable

Run from repo root:
    python3 scripts/enhance/i18n_audit.py            # write both reports
    python3 scripts/enhance/i18n_audit.py --summary  # totals only
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
OUT_MD = ROOT / "docs" / "i18n-audit.md"
OUT_JSON = ROOT / "docs" / "i18n-audit.json"

PAIRS: list[tuple[str, str]] = [
    ("nameZh", "nameEn"),
    ("titleZh", "titleEn"),
    ("termZh", "termEn"),
]

# Some legacy records use a bare `name`/`title` key for the English value
# instead of `nameEn`/`titleEn`. Treat presence of either as "covered".
EN_FALLBACKS: dict[str, str] = {
    "nameEn": "name",
    "titleEn": "title",
    "termEn": "term",
}


def is_blank(v: Any) -> bool:
    return v is None or (isinstance(v, str) and not v.strip())


def _bucket(path: str, pair: str) -> str:
    """Strip concrete array indices so cases.json[0] / [1] / [N] aggregate.

    cases.json[0].titleZh/titleEn  →  cases.json[].titleZh/titleEn
    """
    import re
    return f"{re.sub(r'\[\d+\]', '[]', path)} → {pair}"


def walk(obj: Any, path: str, gaps: list, ok_count: Counter, miss_count: Counter):
    """Recursive walk: any dict with a Chinese pair member but missing English."""
    if isinstance(obj, dict):
        for zh_k, en_k in PAIRS:
            if not is_blank(obj.get(zh_k)):
                bucket = _bucket(path, f"{zh_k}/{en_k}")
                fallback_key = EN_FALLBACKS.get(en_k)
                en_present = (
                    not is_blank(obj.get(en_k))
                    or (fallback_key and not is_blank(obj.get(fallback_key)))
                )
                if not en_present:
                    gaps.append({
                        "path": path,
                        "pair": f"{zh_k}/{en_k}",
                        "id": obj.get("id"),
                        "zh": obj.get(zh_k),
                    })
                    miss_count[bucket] += 1
                else:
                    ok_count[bucket] += 1
        for k, v in obj.items():
            walk(v, f"{path}.{k}", gaps, ok_count, miss_count)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            walk(v, f"{path}[{i}]", gaps, ok_count, miss_count)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--summary", action="store_true",
                    help="Print summary only, don't write files")
    args = ap.parse_args()

    all_gaps: list = []
    ok_count: Counter = Counter()
    miss_count: Counter = Counter()

    for fn in sorted(DATA_DIR.rglob("*.json")):
        rel = str(fn.relative_to(DATA_DIR))
        if rel.startswith("users/"):
            continue
        with fn.open(encoding="utf-8") as f:
            data = json.load(f)
        # Stamp gaps with file path
        file_gaps: list = []
        walk(data, rel, file_gaps, ok_count, miss_count)
        for g in file_gaps:
            g["file"] = f"data/{rel}"
            all_gaps.append(g)

    # Per-file aggregate counts
    by_file: dict[str, list] = defaultdict(list)
    for g in all_gaps:
        by_file[g["file"]].append(g)

    if args.summary:
        print(f"i18n missing English fields: {len(all_gaps)}")
        for k, v in miss_count.most_common():
            ok = ok_count.get(k, 0)
            total = ok + v
            pct = 100 * ok / total if total else 0
            print(f"  {k:<60}  {v:>4} missing ({pct:.0f}% ok)")
        return 0

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps({"missingTotal": len(all_gaps), "items": all_gaps},
                   ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    md = [
        "# i18n / 英文字段覆盖审计",
        "",
        f"_当前共 **{len(all_gaps)}** 处缺英文_",
        "",
        "## 按字段对汇总",
        "",
        "| 字段路径 | 缺失 | 已有 | 覆盖率 |",
        "|---|---:|---:|---:|",
    ]
    for k, v in miss_count.most_common():
        ok = ok_count.get(k, 0)
        total = ok + v
        pct = 100 * ok / total if total else 0
        md.append(f"| `{k}` | {v} | {ok} | {pct:.0f}% |")

    md += [
        "",
        "## 修补指南",
        "",
        "1. **批量补完**：用 admin UI（`/admin`）找到对应模块的记录，填 `nameEn` / `titleEn` / `termEn`",
        "2. **直接编辑**：打开 `data/<file>` 找到 `id`，加对应英文字段",
        "3. **AI 辅助**：把 zh 值粘给翻译工具，注意保留 WHO / NCI Thesaurus 学名",
        "4. 修复后跑 `python3 scripts/enhance/i18n_audit.py --summary` 验证",
        "",
        "## 详细清单",
        "",
    ]

    for file_path, gaps in sorted(by_file.items()):
        md.append(f"### `{file_path}` — {len(gaps)} 处")
        md.append("")
        md.append("| 字段对 | 路径 | id | zh 内容 |")
        md.append("|---|---|---|---|")
        for g in gaps[:80]:
            zh = (g["zh"] or "").replace("|", "\\|")
            path = g["path"][len(file_path) - len("data/") :].lstrip(".")
            md.append(f"| `{g['pair']}` | `{path}` | `{g.get('id') or '—'}` | {zh} |")
        if len(gaps) > 80:
            md.append(f"| … | _and {len(gaps) - 80} more_ | | |")
        md.append("")

    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text("\n".join(md), encoding="utf-8")

    print(f"Wrote {OUT_MD.relative_to(ROOT)}")
    print(f"Wrote {OUT_JSON.relative_to(ROOT)}")
    print(f"Total missing: {len(all_gaps)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
