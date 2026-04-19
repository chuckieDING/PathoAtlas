"""Progress dashboard for the enhancement pipeline.

Reads:
  - docs/enhancement-tasks.json  (what needs doing)
  - docs/enhancement-results/*.json (what's been done)
  - docs/enhancement-plan.json  (cost + priority)

Produces:
  1. Per-dimension table: total / done / clean / warn / critical / est_usd_left
  2. Per-file table: top 10 files by remaining task count
  3. Summary card: progress %, validator pass rate, actual spend vs est

Usage:
    python scripts/enhance/report.py           # pretty-print to stdout
    python scripts/enhance/report.py --json    # machine-readable
    python scripts/enhance/report.py --md      # markdown (paste into GitHub)
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from validate import validate_result  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
TASKS_FILE = ROOT / "docs" / "enhancement-tasks.json"
PLAN_FILE = ROOT / "docs" / "enhancement-plan.json"
RESULTS_DIR = ROOT / "docs" / "enhancement-results"

# Pricing (Opus 4.7). See claude-api skill / models table.
INPUT_USD_PER_TOK = 5.0 / 1_000_000
OUTPUT_USD_PER_TOK = 25.0 / 1_000_000
CACHE_READ_USD_PER_TOK = 0.5 / 1_000_000
CACHE_WRITE_USD_PER_TOK = 6.25 / 1_000_000  # 1.25x input


def load_tasks() -> tuple[list[dict], dict]:
    with TASKS_FILE.open(encoding="utf-8") as f:
        doc = json.load(f)
    return doc["tasks"], doc


def load_plan() -> dict | None:
    if not PLAN_FILE.exists():
        return None
    with PLAN_FILE.open(encoding="utf-8") as f:
        return json.load(f)


def load_results() -> dict[str, dict]:
    """taskId → result record"""
    out = {}
    if not RESULTS_DIR.exists():
        return out
    for rf in RESULTS_DIR.glob("*.json"):
        with rf.open(encoding="utf-8") as f:
            rec = json.load(f)
        tid = rec.get("taskId")
        if tid:
            out[tid] = rec
    return out


def actual_cost(usage: dict) -> float:
    if not usage:
        return 0.0
    return (
        usage.get("input_tokens", 0) * INPUT_USD_PER_TOK
        + usage.get("output_tokens", 0) * OUTPUT_USD_PER_TOK
        + usage.get("cache_read_input_tokens", 0) * CACHE_READ_USD_PER_TOK
        + usage.get("cache_creation_input_tokens", 0) * CACHE_WRITE_USD_PER_TOK
    )


def build_report() -> dict:
    tasks, tasks_doc = load_tasks()
    plan = load_plan()
    results = load_results()

    dim_stats = defaultdict(lambda: {
        "total": 0, "done": 0,
        "clean": 0,           # zero issues
        "infoOnly": 0,        # info marks only (e.g. _low_confidence) — usable
        "warn": 0,            # has warn — review recommended
        "critical": 0,        # has critical — must fix
        "parseFail": 0,
        "actualUsd": 0.0,
        "actualInputTokens": 0, "actualOutputTokens": 0,
        "actualCacheRead": 0, "actualCacheWrite": 0,
    })
    file_remaining = defaultdict(int)

    for t in tasks:
        dim = t["dimension"]
        dim_stats[dim]["total"] += 1

        res = results.get(t["taskId"])
        if not res:
            if t.get("targetFile"):
                file_remaining[t["targetFile"]] += 1
            continue

        dim_stats[dim]["done"] += 1

        # Cost tracking
        usage = res.get("usage") or {}
        dim_stats[dim]["actualUsd"] += actual_cost(usage)
        dim_stats[dim]["actualInputTokens"] += usage.get("input_tokens", 0)
        dim_stats[dim]["actualOutputTokens"] += usage.get("output_tokens", 0)
        dim_stats[dim]["actualCacheRead"] += usage.get("cache_read_input_tokens", 0)
        dim_stats[dim]["actualCacheWrite"] += usage.get("cache_creation_input_tokens", 0)

        # Validator pass
        if not res.get("parseOk"):
            dim_stats[dim]["parseFail"] += 1
            continue
        rep = validate_result(res)
        sev = rep.worst_severity()
        if sev == "critical":
            dim_stats[dim]["critical"] += 1
        elif sev == "warn":
            dim_stats[dim]["warn"] += 1
        elif sev == "info":
            # Info-only (e.g. model self-flagged _low_confidence on a real
            # citation). Output is still usable; reviewer should glance.
            dim_stats[dim]["infoOnly"] += 1
        else:
            dim_stats[dim]["clean"] += 1

    # Per-dimension estimated remaining cost from plan
    if plan:
        plan_costs = plan.get("costByDimension", {})
        for dim, s in dim_stats.items():
            pc = plan_costs.get(dim, {})
            per_task_est = (
                pc.get("estUSDWithCache", 0) / max(1, pc.get("taskCount", 1))
            )
            remaining = s["total"] - s["done"]
            s["estRemainingUsd"] = round(per_task_est * remaining, 2)

    # Aggregate
    total_tasks = len(tasks)
    total_done = sum(s["done"] for s in dim_stats.values())
    total_clean = sum(s["clean"] for s in dim_stats.values())
    total_info = sum(s["infoOnly"] for s in dim_stats.values())
    total_warn = sum(s["warn"] for s in dim_stats.values())
    total_critical = sum(s["critical"] for s in dim_stats.values())
    total_usable = total_clean + total_info  # acceptable for downstream use
    total_usd = sum(s["actualUsd"] for s in dim_stats.values())
    total_cache_read = sum(s["actualCacheRead"] for s in dim_stats.values())
    total_input = sum(s["actualInputTokens"] for s in dim_stats.values())

    cache_hit_pct = (
        100 * total_cache_read / (total_cache_read + total_input)
        if (total_cache_read + total_input) > 0 else 0
    )

    return {
        "generatedAt": date.today().isoformat(),
        "totals": {
            "tasks": total_tasks,
            "done": total_done,
            "remaining": total_tasks - total_done,
            "progressPct": round(100 * total_done / total_tasks, 1),
            "clean": total_clean,
            "infoOnly": total_info,
            "warn": total_warn,
            "critical": total_critical,
            "usable": total_usable,
            "usablePct": round(100 * total_usable / max(1, total_done), 1),
            "cleanPct": round(100 * total_clean / max(1, total_done), 1),
            "actualUsd": round(total_usd, 2),
            "cacheHitPct": round(cache_hit_pct, 1),
        },
        "byDimension": dict(dim_stats),
        "topRemainingFiles": dict(
            sorted(file_remaining.items(), key=lambda x: -x[1])[:10]
        ),
        "planned": plan is not None,
    }


# --------- rendering ---------


def render_text(r: dict) -> str:
    t = r["totals"]
    lines = [
        f"PathoAtlas enhancement report · {r['generatedAt']}",
        "=" * 62,
        f"  Progress:     {t['done']:>4}/{t['tasks']} ({t['progressPct']}%)  "
        f"remaining: {t['remaining']}",
        f"  Usable:       {t['usable']}/{t['done']} ({t['usablePct']}%)  "
        f"= clean {t['clean']} + infoOnly {t['infoOnly']}",
        f"  To-review:    warn {t['warn']}  critical {t['critical']}",
        f"  Spend:        ${t['actualUsd']}  "
        f"cache hit: {t['cacheHitPct']}%",
        "",
        f'{"dimension":<30} {"total":>5} {"done":>4} {"clean":>5} '
        f'{"info":>4} {"warn":>4} {"crit":>4} {"parseE":>6} {"usd":>6}',
        "-" * 76,
    ]
    by_dim = sorted(
        r["byDimension"].items(),
        key=lambda x: (-x[1]["total"], x[0]),
    )
    for dim, s in by_dim:
        if s["done"] == 0 and s["total"] < 3:
            continue
        lines.append(
            f'{dim:<30} {s["total"]:>5} {s["done"]:>4} {s["clean"]:>5} '
            f'{s["infoOnly"]:>4} {s["warn"]:>4} {s["critical"]:>4} '
            f'{s["parseFail"]:>6} {s["actualUsd"]:>6.2f}'
        )
    lines.append("")
    lines.append("Top 10 files by remaining tasks:")
    for f, n in r["topRemainingFiles"].items():
        lines.append(f"  {n:>4}  {f}")
    return "\n".join(lines)


def render_markdown(r: dict) -> str:
    t = r["totals"]
    md = [
        f"# PathoAtlas Enhancement Report — {r['generatedAt']}",
        "",
        f"- **Progress**: {t['done']}/{t['tasks']} ({t['progressPct']}%)",
        f"- **Quality**: {t['clean']}/{t['done']} clean ({t['cleanPct']}%), "
        f"{t['critical']} critical",
        f"- **Spend**: ${t['actualUsd']} · cache hit {t['cacheHitPct']}%",
        "",
        "## By dimension",
        "",
        "| dimension | total | done | clean | warn | crit | parse errs | USD |",
        "|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for dim, s in sorted(r["byDimension"].items(), key=lambda x: -x[1]["total"]):
        md.append(
            f"| {dim} | {s['total']} | {s['done']} | {s['clean']} | "
            f"{s['warn']} | {s['critical']} | {s['parseFail']} | "
            f"{s['actualUsd']:.2f} |"
        )
    md += ["", "## Top remaining files", ""]
    for f, n in r["topRemainingFiles"].items():
        md.append(f"- `{f}` — {n} tasks")
    return "\n".join(md)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--md", action="store_true")
    args = ap.parse_args()

    r = build_report()

    if args.json:
        print(json.dumps(r, ensure_ascii=False, indent=2))
    elif args.md:
        print(render_markdown(r))
    else:
        print(render_text(r))
    return 0


if __name__ == "__main__":
    sys.exit(main())
