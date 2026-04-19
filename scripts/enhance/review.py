"""Human-review queue generator + rejection list manager.

Workflow:
  1. python3 scripts/enhance/review.py            # generate review-queue.md
  2. open docs/review-queue.md in your editor/viewer, scan the items
  3. python3 scripts/enhance/review.py --reject T0123 T0456  # mark to skip
  4. python3 scripts/enhance/merge.py             # rejected ones are skipped

Subcommands:
  (none)                  generate docs/review-queue.md (default action)
  --show TASKID           print a single result's full content
  --reject TASKID...      append taskId(s) to docs/review-rejections.txt
  --unreject TASKID...    remove taskId(s) from rejection list
  --list-rejections       show current rejection list
  --severity SEV          filter queue by min severity (info|warn|critical)
  --dimension DIM         filter queue by dimension
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from validate import validate_result  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
RESULTS_DIR = ROOT / "docs" / "enhancement-results"
QUEUE_FILE = ROOT / "docs" / "review-queue.md"
REJECTIONS_FILE = ROOT / "docs" / "review-rejections.txt"

SEVERITY_ORDER = {"critical": 3, "warn": 2, "info": 1, None: 0}


def load_rejections() -> set[str]:
    if not REJECTIONS_FILE.exists():
        return set()
    out = set()
    for line in REJECTIONS_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            out.add(line.split()[0])  # tolerate "T0001  some comment"
    return out


def save_rejections(ids: set[str]) -> None:
    REJECTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# review-rejections.txt — task IDs to skip during merge.py",
        "# one taskId per line; lines starting with # are comments",
        "",
    ]
    for tid in sorted(ids):
        lines.append(tid)
    REJECTIONS_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def show_one(task_id: str) -> int:
    p = RESULTS_DIR / f"{task_id}.json"
    if not p.exists():
        print(f"No result for {task_id}", file=sys.stderr)
        return 1
    r = json.load(p.open(encoding="utf-8"))
    rep = validate_result(r)

    print(f"=== {r['taskId']} [{r['dimension']}] ===")
    print(f"Target: {r.get('targetFile')}::{r.get('targetId')}")
    print(f"Name:   {r.get('targetNameZh') or ''}")
    print(f"Model:  {r.get('model')}  Cost: ${r.get('totalCostUsd', 0):.3f}  "
          f"{r.get('elapsedSeconds')}s")
    print(f"ParseOk: {r.get('parseOk')}  Issues: {len(rep.issues)}")
    if rep.issues:
        for i in rep.issues:
            mark = {"critical": "✗", "warn": "⚠", "info": "·"}[i.severity]
            print(f"  {mark} [{i.severity}] {i.code}: {i.message}")
    print()
    print("--- output ---")
    print(json.dumps(r.get("output"), ensure_ascii=False, indent=2))
    return 0


def render_queue(severity_min: str, dim_filter: str | None) -> str:
    sev_min_int = SEVERITY_ORDER.get(severity_min, 1)
    rejections = load_rejections()

    by_dim: dict[str, list[tuple[str, dict, list]]] = defaultdict(list)
    for f in sorted(RESULTS_DIR.glob("*.json")):
        r = json.load(f.open(encoding="utf-8"))
        if not r.get("parseOk"):
            continue
        if dim_filter and r.get("dimension") != dim_filter:
            continue
        rep = validate_result(r)
        worst = SEVERITY_ORDER.get(rep.worst_severity(), 0)
        if worst < sev_min_int:
            continue
        by_dim[r["dimension"]].append((r["taskId"], r, rep.issues))

    lines = [
        "# PathoAtlas — Review Queue",
        "",
        f"_Generated · severity ≥ **{severity_min}**_",
        "",
        "## How to use",
        "",
        "1. Scan items below; each block is one model output flagged for review.",
        "2. To **reject** a result (skip during merge), copy its task ID:",
        "   `python3 scripts/enhance/review.py --reject T0123 T0456 ...`",
        "3. To **edit** a result in place, open the JSON file directly:",
        "   `docs/enhancement-results/T0123.json` and modify the `output` field.",
        "4. Once happy, run `python3 scripts/enhance/merge.py --apply`.",
        "",
        f"**Currently rejected:** {len(rejections)} task(s) · "
        f"see `docs/review-rejections.txt`",
        "",
    ]

    total = 0
    for dim, items in sorted(by_dim.items()):
        lines.append(f"## `{dim}` — {len(items)} item(s)")
        lines.append("")
        for tid, r, issues in items:
            total += 1
            target = r.get("targetNameZh") or r.get("targetId") or ""
            badge = "🔴 REJECTED" if tid in rejections else ""
            lines.append(f"### {tid} · {target}  {badge}")
            lines.append("")
            lines.append(
                f"- File: `{r.get('targetFile')}` · id: `{r.get('targetId')}`"
            )
            for i in issues:
                mark = {"critical": "✗", "warn": "⚠", "info": "·"}[i.severity]
                lines.append(f"- {mark} **{i.severity}** {i.code}: {i.message}")
            out = r.get("output") or {}
            # Render structured output compactly
            if isinstance(out, dict):
                if reason := out.get("_reason"):
                    lines.append(f"- 模型说明: _{reason}_")
                # Pull out main payload (first non-underscore key)
                payload_keys = [k for k in out if not k.startswith("_")]
                for k in payload_keys:
                    v = out[k]
                    lines.append(f"")
                    lines.append(f"  **{k}**:")
                    if isinstance(v, list):
                        for item in v[:6]:
                            if isinstance(item, dict):
                                title = item.get("title") or item.get("nameZh") or ""
                                org = item.get("org") or item.get("organization") or ""
                                yr = item.get("year", "")
                                summary = (item.get("summary") or
                                           item.get("relevantPoint") or
                                           item.get("caption") or "")[:120]
                                lines.append(
                                    f"  - **{title}** "
                                    f"({org}, {yr})"
                                )
                                if summary:
                                    lines.append(f"    {summary}")
                            else:
                                lines.append(f"  - {item}")
                    elif isinstance(v, str):
                        snippet = v[:300] + ("…" if len(v) > 300 else "")
                        lines.append(f"  > {snippet}")
                    else:
                        lines.append(f"  {json.dumps(v, ensure_ascii=False)[:200]}")
            lines.append("")
            lines.append(f"<details><summary>详情 / raw JSON</summary>")
            lines.append("")
            lines.append("```json")
            lines.append(json.dumps(r.get("output"), ensure_ascii=False, indent=2))
            lines.append("```")
            lines.append("</details>")
            lines.append("")
            lines.append("---")
            lines.append("")
    if total == 0:
        lines.append("_No items need review at this severity._")
    else:
        lines.insert(4, f"**Total items: {total}**")
        lines.insert(5, "")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--show", metavar="TASKID")
    ap.add_argument("--reject", nargs="+", metavar="TASKID")
    ap.add_argument("--unreject", nargs="+", metavar="TASKID")
    ap.add_argument("--list-rejections", action="store_true")
    ap.add_argument("--severity", default="info",
                    choices=["info", "warn", "critical"],
                    help="minimum severity to include in queue")
    ap.add_argument("--dimension", help="filter queue by dimension")
    args = ap.parse_args()

    if args.show:
        return show_one(args.show)

    if args.reject:
        ids = load_rejections()
        new = set(args.reject) - ids
        ids.update(new)
        save_rejections(ids)
        print(f"Rejected: +{len(new)} ({len(ids)} total)")
        return 0

    if args.unreject:
        ids = load_rejections()
        removed = ids & set(args.unreject)
        ids -= removed
        save_rejections(ids)
        print(f"Unrejected: -{len(removed)} ({len(ids)} remain)")
        return 0

    if args.list_rejections:
        ids = sorted(load_rejections())
        for tid in ids:
            print(tid)
        print(f"--- {len(ids)} total ---", file=sys.stderr)
        return 0

    # Default: generate queue
    md = render_queue(args.severity, args.dimension)
    QUEUE_FILE.parent.mkdir(parents=True, exist_ok=True)
    QUEUE_FILE.write_text(md, encoding="utf-8")
    print(f"Wrote {QUEUE_FILE.relative_to(ROOT)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
