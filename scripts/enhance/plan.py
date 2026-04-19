"""Task prioritizer and cost estimator.

Reads docs/enhancement-tasks.json and produces docs/enhancement-plan.json
with a scored, ordered batch plan. Also estimates token cost per dimension.

Scoring heuristic:
  priority = impact × (1 − hallucination_risk) × freshness_value

- impact: tasks targeting high-incidence cancers in China weigh more
- hallucination_risk: higher for cn_guideline/consensus (factual claims),
  lower for description_expand (paraphrasing)
- freshness_value: cn_guideline > cn_consensus > others (Chinese guidelines
  refresh annually)

Usage:
    python scripts/enhance/plan.py            # write plan
    python scripts/enhance/plan.py --top 50   # print top 50 to stdout
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from prompts import build_system_prompt, build_user_prompt, estimate_tokens

ROOT = Path(__file__).resolve().parents[2]
TASKS_FILE = ROOT / "docs" / "enhancement-tasks.json"
PLAN_FILE = ROOT / "docs" / "enhancement-plan.json"

# -------- scoring weights --------

# Higher = more valuable dimension (scale 0..1)
DIMENSION_IMPACT = {
    "cn_guideline": 1.00,           # unique value for Chinese users
    "cn_consensus": 0.95,
    "cn_literature": 0.60,
    "description_expand": 0.70,     # improves all downstream reads
    "images": 0.40,                 # SVG placeholders need manual artwork anyway
    "staining_image": 0.40,
    "case_expert_commentary": 0.55,
    "case_cn_reference": 0.70,
    "curriculum_learning_objectives": 0.50,
    "molecular_cn_cdx": 0.75,       # clinically actionable
    "organ_epidemiology_cn": 0.65,
    "panel_cn_recommendation": 0.60,
    "staging_cn_version": 0.70,
    "grossing_cn_protocol": 0.60,
    "synoptic_cn_align": 0.55,
    "cytology_cn_consensus": 0.70,
    "flowchart_validate": 0.45,
    "glossary_new_term": 0.50,
    "glossary_audit": 0.40,
    "frozen_pitfall_image": 0.40,
    "diff_comparison_table": 0.50,
    # new-entry dimensions — lower because content coverage, not quality
    "molecular_new_entry": 0.55,
    "staging_new_entry": 0.50,
    "special_stain_new_entry": 0.45,
    "synoptic_new_entry": 0.50,
    "grossing_new_entry": 0.45,
    "cytology_new_entry": 0.50,
    "frozen_new_entry": 0.40,
    "diff_new_entry": 0.45,
    "case_images": 0.35,
    "cytology_category_images": 0.35,
    "special_stain_images": 0.35,
    "curriculum_cn_align": 0.40,
    # meta / housekeeping
    "cross_integrity": 0.60,
    "dedupe": 0.80,                 # fixing data corruption is cheap + high-leverage
    "normalize": 0.30,
    "coverage": 0.40,
}

# Higher = more likely to hallucinate. Factored INTO the priority negatively.
DIMENSION_HALLUCINATION_RISK = {
    "cn_guideline": 0.50,      # must be real, moderate risk with our guardrails
    "cn_consensus": 0.55,
    "cn_literature": 0.70,     # paper titles + DOI easy to fabricate
    "description_expand": 0.15, # general morphology description, safer
    "images": 0.10,            # just placeholders + captions
    "staining_image": 0.10,
    "organ_epidemiology_cn": 0.40,
    "molecular_cn_cdx": 0.35,
    "staging_cn_version": 0.20,
    "grossing_cn_protocol": 0.25,
    "synoptic_cn_align": 0.20,
    "panel_cn_recommendation": 0.20,
    "flowchart_validate": 0.20,
    "case_cn_reference": 0.50,
    "case_expert_commentary": 0.15,
    "curriculum_learning_objectives": 0.15,
    "cytology_cn_consensus": 0.50,
    "glossary_new_term": 0.25,
    "glossary_audit": 0.15,
    "diff_comparison_table": 0.25,
    "frozen_pitfall_image": 0.20,
    # new-entry: moderate (building structure from known WHO data)
    "molecular_new_entry": 0.35,
    "staging_new_entry": 0.20,
    "special_stain_new_entry": 0.20,
    "synoptic_new_entry": 0.20,
    "grossing_new_entry": 0.25,
    "cytology_new_entry": 0.40,
    "frozen_new_entry": 0.25,
    "diff_new_entry": 0.25,
    "case_images": 0.10,
    "cytology_category_images": 0.15,
    "special_stain_images": 0.10,
    "curriculum_cn_align": 0.25,
    "cross_integrity": 0.10,
    "dedupe": 0.05,
    "normalize": 0.05,
    "coverage": 0.20,
}

# High-incidence cancers in China (CA Cancer J Clin 2024 top causes) — boost tasks targeting them
HIGH_INCIDENCE_NAMES = {
    "肺腺癌", "肺鳞状细胞癌", "小细胞肺癌",
    "肝细胞癌", "胃腺癌", "食管鳞状细胞癌", "结直肠腺癌",
    "乳腺浸润性导管癌", "浸润性导管癌(非特殊类型)", "甲状腺乳头状癌",
    "前列腺腺癌", "尿路上皮癌", "子宫颈鳞状细胞癌", "宫颈鳞状细胞癌",
    "胰腺导管腺癌",
}

COMMON_MARKERS = {"ER", "PR", "HER2", "Ki-67", "CK7", "CK20",
                  "TTF-1", "CDX2", "GATA3", "PAX8", "p63", "p40"}

# Pricing (Opus 4.7): $5 per 1M input, $25 per 1M output. Cache read = 0.1x.
INPUT_PRICE = 5.0 / 1_000_000
CACHE_READ_PRICE = 0.5 / 1_000_000
OUTPUT_PRICE = 25.0 / 1_000_000
ASSUMED_OUTPUT_TOKENS = 800  # rough average per response


def score_task(task: dict) -> tuple[float, dict]:
    dim = task.get("dimension", "")
    impact = DIMENSION_IMPACT.get(dim, 0.3)
    risk = DIMENSION_HALLUCINATION_RISK.get(dim, 0.5)

    name_zh = task.get("targetNameZh") or ""
    target_abbr = task.get("targetAbbr") or ""

    bonus = 0.0
    if name_zh in HIGH_INCIDENCE_NAMES:
        bonus += 0.3
    if target_abbr in COMMON_MARKERS:
        bonus += 0.2

    score = impact * (1 - risk) + bonus

    return score, {
        "impact": round(impact, 2),
        "hallucinationRisk": round(risk, 2),
        "bonus": round(bonus, 2),
        "score": round(score, 3),
    }


def estimate_cost_for_task(task: dict) -> dict:
    """Estimate input/output token cost for a single task."""
    sp = build_system_prompt(task["dimension"])
    up = build_user_prompt(task)
    sys_tokens = estimate_tokens(sp)
    user_tokens = estimate_tokens(up)
    # Assume first request writes cache, subsequent reads
    return {
        "systemTokens": sys_tokens,
        "userTokens": user_tokens,
        "estOutputTokens": ASSUMED_OUTPUT_TOKENS,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=0,
                    help="Print top N scored tasks to stdout (0 = skip)")
    ap.add_argument("--no-write", action="store_true",
                    help="Don't write plan file")
    args = ap.parse_args()

    with TASKS_FILE.open(encoding="utf-8") as f:
        doc = json.load(f)

    tasks = doc["tasks"]
    scored = []
    for t in tasks:
        score, detail = score_task(t)
        scored.append({**t, "_score": score, "_scoreDetail": detail})

    scored.sort(key=lambda x: (-x["_score"], x["taskId"]))

    # Cost estimate by dimension
    from collections import defaultdict
    dim_stats = defaultdict(lambda: {"count": 0, "sysTokens": 0,
                                     "userTokens": 0, "outputTokens": 0})
    for t in scored:
        e = estimate_cost_for_task(t)
        d = dim_stats[t["dimension"]]
        d["count"] += 1
        d["sysTokens"] = e["systemTokens"]  # same per-dim
        d["userTokens"] += e["userTokens"]
        d["outputTokens"] += e["estOutputTokens"]

    # Cost: per dimension, sys is cached after first. So:
    #   first request: sys @ 1.25x write + user + output
    #   remaining: sys @ 0.1x read + user + output
    dim_costs = {}
    total_cost = 0.0
    for dim, s in dim_stats.items():
        first_in = s["sysTokens"] * 1.25 + s["userTokens"] / s["count"]
        other_in = (s["sysTokens"] * 0.1 + s["userTokens"] / s["count"]) * (s["count"] - 1)
        input_tokens_billed = first_in + other_in
        cost = (
            input_tokens_billed * INPUT_PRICE / 1.0
            + s["outputTokens"] * OUTPUT_PRICE
        )
        # Without caching (for comparison)
        no_cache_cost = (
            (s["sysTokens"] + s["userTokens"] / s["count"]) * s["count"] * INPUT_PRICE
            + s["outputTokens"] * OUTPUT_PRICE
        )
        dim_costs[dim] = {
            "taskCount": s["count"],
            "perTaskSysTokens": s["sysTokens"],
            "estTotalInputTokensBilled": round(input_tokens_billed, 0),
            "estOutputTokens": s["outputTokens"],
            "estUSDWithCache": round(cost, 2),
            "estUSDNoCache": round(no_cache_cost, 2),
            "cacheSavingsPct": round(100 * (1 - cost / no_cache_cost), 1) if no_cache_cost else 0,
        }
        total_cost += cost

    plan = {
        "generatedFrom": "docs/enhancement-tasks.json",
        "totalTasks": len(scored),
        "estTotalUSDWithCache": round(total_cost, 2),
        "model": "claude-opus-4-7",
        "assumedOutputTokensPerTask": ASSUMED_OUTPUT_TOKENS,
        "costByDimension": dim_costs,
        "scoredTasks": [
            {"taskId": t["taskId"], "dimension": t["dimension"],
             "targetNameZh": t.get("targetNameZh"),
             "score": t["_score"], "scoreDetail": t["_scoreDetail"]}
            for t in scored
        ],
    }

    if args.top:
        print(f"Top {args.top} tasks by score:\n")
        for t in scored[:args.top]:
            print(f"  {t['_score']:.3f}  {t['taskId']}  {t['dimension']:<28} "
                  f"{t.get('targetNameZh','')}")

    if not args.no_write:
        with PLAN_FILE.open("w", encoding="utf-8") as f:
            json.dump(plan, f, ensure_ascii=False, indent=2)
        print(f"\nWrote plan: {PLAN_FILE}", file=sys.stderr)
        print(f"Total estimated cost (with caching): ${total_cost:.2f}",
              file=sys.stderr)
        print(f"Top 5 dimensions by cost:", file=sys.stderr)
        for dim, c in sorted(dim_costs.items(),
                              key=lambda x: -x[1]["estUSDWithCache"])[:5]:
            print(f"  {dim:<30} ${c['estUSDWithCache']:>6.2f}  "
                  f"({c['taskCount']} tasks, cache saves {c['cacheSavingsPct']}%)",
                  file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
