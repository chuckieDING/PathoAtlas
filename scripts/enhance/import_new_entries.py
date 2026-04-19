"""Import `*_new_entry` enhancement results as real records.

Background: the original merge.py tried to find a host record by `targetId`
and store the new-entry payload as `_enhance_<dim>` on that host. When the
target id didn't yet exist, the merge silently dropped the payload. When
the target id collided with an existing stub record, the payload got
attached as a sub-field instead of becoming the record itself.

This script reads `docs/enhancement-results/*.json`, picks out anything
whose dimension ends in `_new_entry` (or is `glossary_new_term`), and:

  - If the payload's `id` matches an existing record → field-level merge:
    only fill keys the existing record is missing or empty.
  - If `id` is new → append as a new array element to the target file.

After the import:
  - Strip any leftover `_enhance_<dim>_new_entry` from the data files
    (they are now redundant, content has been promoted).
  - Mirror writes to both data/ and data-runtime/.

Run from repo root:
    python3 scripts/enhance/import_new_entries.py            # dry-run
    python3 scripts/enhance/import_new_entries.py --apply    # write
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
RESULTS_DIR = ROOT / "docs" / "enhancement-results"
DATA_DIR = ROOT / "data"
RUNTIME_DIR = ROOT / "data-runtime"

# dimensions that produce brand-new records
NEW_ENTRY_DIMENSIONS = {
    "molecular_new_entry",
    "synoptic_new_entry",
    "staging_new_entry",
    "special_stain_new_entry",
    "frozen_new_entry",
    "diff_new_entry",
    "cytology_new_entry",
    "grossing_new_entry",
    "glossary_new_term",  # not "_new_entry" but same semantics
}


def is_empty(v: Any) -> bool:
    """Treat None / empty string / empty list / empty dict as empty."""
    if v is None or v == "" or v == [] or v == {}:
        return True
    return False


def merge_into_existing(existing: dict, payload: dict) -> tuple[dict, list[str]]:
    """Field-level fill: only add keys missing/empty in `existing`.

    Returns (modified_record, list-of-changes). Never overwrites a
    populated field — that would risk regressing curated content.
    """
    changes: list[str] = []
    for k, v in payload.items():
        if k.startswith("_") or k == "id":
            continue
        if is_empty(existing.get(k)):
            existing[k] = v
            changes.append(f"+{k}")
    return existing, changes


def strip_namespaced_new_entry(arr: list, dimension: str) -> int:
    """Remove `_enhance_<dim>` field from any record (it's now redundant)."""
    field = f"_enhance_{dimension}"
    n = 0
    for rec in arr:
        if isinstance(rec, dict) and field in rec:
            rec.pop(field, None)
            n += 1
    return n


def process_target_file(target_rel: str, dim_payloads: dict[str, list[dict]]) -> tuple[list[Any], dict]:
    """Apply all new-entry payloads pointing at one target file.
    Returns (modified_array, summary_dict).
    """
    seed_path = ROOT / target_rel
    if not seed_path.exists():
        return [], {"error": f"missing {target_rel}"}

    with seed_path.open(encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        return data, {"error": "target is not an array"}

    # Build id → record index for fast lookup
    by_id = {rec.get("id"): rec for rec in data if isinstance(rec, dict)}

    appended = 0
    merged = 0
    appended_ids: list[str] = []
    merged_details: list[str] = []

    for dim, payloads in dim_payloads.items():
        for p in payloads:
            new_id = p.get("id")
            if not new_id:
                continue
            if new_id in by_id:
                _, changes = merge_into_existing(by_id[new_id], p)
                if changes:
                    merged += 1
                    merged_details.append(f"  {dim} merge {new_id}: {changes}")
            else:
                data.append(p)
                by_id[new_id] = p
                appended += 1
                appended_ids.append(new_id)

    # Strip any namespaced fields that may still be present
    stripped = 0
    for dim in dim_payloads:
        stripped += strip_namespaced_new_entry(data, dim)

    return data, {
        "appended": appended,
        "merged": merged,
        "stripped": stripped,
        "appendedIds": appended_ids,
        "mergedDetails": merged_details,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="Write changes (default: dry-run)")
    args = ap.parse_args()

    if not RESULTS_DIR.exists():
        print(f"missing {RESULTS_DIR}", file=sys.stderr)
        return 1

    # Group results by target file → dim → list of payloads
    grouped: dict[str, dict[str, list[dict]]] = {}
    for rf in sorted(RESULTS_DIR.glob("*.json")):
        with rf.open(encoding="utf-8") as f:
            r = json.load(f)
        if not r.get("parseOk"):
            continue
        dim = r.get("dimension", "")
        if dim not in NEW_ENTRY_DIMENSIONS:
            continue
        target = r.get("targetFile")
        if not target:
            continue
        out = r.get("output") or {}
        if not isinstance(out, dict) or not out.get("id"):
            continue
        grouped.setdefault(target, {}).setdefault(dim, []).append(out)

    if not grouped:
        print("No new-entry payloads found.", file=sys.stderr)
        return 0

    total_appended = total_merged = total_stripped = 0
    print(f"=== {'APPLIED' if args.apply else 'DRY-RUN'} ===\n")

    for target_rel, dim_payloads in sorted(grouped.items()):
        new_arr, summary = process_target_file(target_rel, dim_payloads)
        if "error" in summary:
            print(f"{target_rel}: {summary['error']}")
            continue
        print(f"{target_rel}")
        print(f"  appended: {summary['appended']} (ids: {summary['appendedIds']})")
        print(f"  merged:   {summary['merged']}")
        print(f"  stripped redundant _enhance_*_new_entry: {summary['stripped']}")
        for d in summary["mergedDetails"][:5]:
            print(d)
        if len(summary["mergedDetails"]) > 5:
            print(f"  ... and {len(summary['mergedDetails']) - 5} more")
        total_appended += summary["appended"]
        total_merged += summary["merged"]
        total_stripped += summary["stripped"]

        if args.apply:
            # Write to both data/ and data-runtime/
            if not target_rel.startswith("data/"):
                continue
            rel_inner = Path(target_rel[len("data/"):])
            for abs_path in (ROOT / target_rel, ROOT / "data-runtime" / rel_inner):
                abs_path.parent.mkdir(parents=True, exist_ok=True)
                with abs_path.open("w", encoding="utf-8") as f:
                    json.dump(new_arr, f, ensure_ascii=False, indent=2)

    print(f"\nSummary: appended={total_appended}  merged={total_merged}  stripped={total_stripped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
