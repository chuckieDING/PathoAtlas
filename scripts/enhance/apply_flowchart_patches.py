"""Apply flowchart_validate patches written by the enhancement pipeline.

Each flowchart record in `data/flowcharts.json` (mirrored in
`data-runtime/flowcharts.json`) may carry a `_enhance_flowchart_validate`
field with shape:
    {
      "patch": {
        "addNodes":    [{ id, type, label }, ...],
        "addEdges":    [{ from, to, label? }, ...],
        "updateNodes": [{ id, label, reason }, ...]
      }
    }

This script:
  1. Reads the patch
  2. Auto-positions new nodes below existing ones (a simple grid layout)
  3. Skips edges whose endpoints don't exist after addNodes
  4. Updates labels of existing nodes (preserves x/y/type)
  5. Validates: no duplicate ids, no orphan edges
  6. Writes both data/ and data-runtime/
  7. Removes the _enhance_flowchart_validate field on success

Run from repo root:
    python3 scripts/enhance/apply_flowchart_patches.py             # dry-run
    python3 scripts/enhance/apply_flowchart_patches.py --apply     # write
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
TARGETS = [ROOT / "data" / "flowcharts.json", ROOT / "data-runtime" / "flowcharts.json"]

NEW_NODE_X_START = 60
NEW_NODE_X_STEP = 200
NEW_NODE_Y_GAP = 90


VALID_NODE_TYPES = {"start", "decision", "result"}
# Map common synonyms the model may use → the project's accepted types.
NODE_TYPE_ALIASES = {
    "leaf": "result",
    "end": "result",
    "terminal": "result",
    "diagnosis": "result",
    "branch": "decision",
    "question": "decision",
    "begin": "start",
    "root": "start",
}


def normalize_node_type(t: str | None) -> str:
    if not t:
        return "result"  # safest default for unspecified
    t = t.lower().strip()
    if t in VALID_NODE_TYPES:
        return t
    return NODE_TYPE_ALIASES.get(t, "result")


def auto_place_new_nodes(existing: list[dict], new_nodes: list[dict]) -> list[dict]:
    """Stack new nodes in a row below the lowest existing node."""
    max_y = max((n.get("y", 0) for n in existing), default=0)
    base_y = max_y + NEW_NODE_Y_GAP
    placed = []
    for i, n in enumerate(new_nodes):
        if "x" in n and "y" in n:
            placed.append(n)
            continue
        placed.append({
            **n,
            "x": NEW_NODE_X_START + i * NEW_NODE_X_STEP,
            "y": base_y,
        })
    return placed


def apply_patch(fc: dict) -> tuple[dict, list[str]]:
    """Apply the patch in-place. Returns (modified_flowchart, change_log)."""
    enh = fc.get("_enhance_flowchart_validate")
    if not enh or not isinstance(enh.get("patch"), dict):
        return fc, []

    patch = enh["patch"]
    add_nodes = patch.get("addNodes") or []
    add_edges = patch.get("addEdges") or []
    update_nodes = patch.get("updateNodes") or []

    nodes: list[dict] = list(fc.get("nodes") or [])
    edges: list[dict] = list(fc.get("edges") or [])
    existing_ids = {n.get("id") for n in nodes}
    changes: list[str] = []

    # 1. Update existing node labels
    for upd in update_nodes:
        nid = upd.get("id")
        new_label = upd.get("label")
        if not nid or not new_label:
            continue
        for n in nodes:
            if n.get("id") == nid and n.get("label") != new_label:
                n["label"] = new_label
                changes.append(f"updateNode: {nid} → '{new_label[:40]}…'")
                break

    # 2. Add new nodes (skip duplicate ids; normalize unknown types)
    fresh: list[dict] = []
    type_normalizations = 0
    for n in add_nodes:
        nid = n.get("id")
        if not nid or nid in existing_ids:
            continue
        original_type = n.get("type")
        normalized = {**n, "type": normalize_node_type(original_type)}
        if normalized["type"] != original_type:
            type_normalizations += 1
        fresh.append(normalized)
    if fresh:
        positioned = auto_place_new_nodes(nodes, fresh)
        nodes.extend(positioned)
        existing_ids.update(n["id"] for n in positioned)
        suffix = (f" ({type_normalizations} types normalized)"
                  if type_normalizations else "")
        changes.append(f"addNodes: +{len(positioned)}{suffix}")

    # 3. Add new edges (skip if endpoints don't exist after addNodes)
    edge_keys = {(e.get("from"), e.get("to")) for e in edges}
    added_edges = 0
    skipped_orphan = 0
    for edge in add_edges:
        f, t = edge.get("from"), edge.get("to")
        if not f or not t:
            continue
        if f not in existing_ids or t not in existing_ids:
            skipped_orphan += 1
            continue
        if (f, t) in edge_keys:
            continue
        edges.append({"from": f, "to": t, **({"label": edge["label"]} if edge.get("label") else {})})
        edge_keys.add((f, t))
        added_edges += 1
    if added_edges:
        changes.append(f"addEdges: +{added_edges}" +
                       (f" (skipped {skipped_orphan} with missing endpoints)" if skipped_orphan else ""))
    elif skipped_orphan:
        changes.append(f"addEdges: 0 added, {skipped_orphan} skipped (orphan endpoints)")

    # Always strip the consumed patch (even if it was a no-op) — it's been
    # processed and shouldn't loiter in the data file.
    if "_enhance_flowchart_validate" in fc:
        fc.pop("_enhance_flowchart_validate", None)
        if not changes:
            changes.append("(no-op patch removed)")

    fc["nodes"] = nodes
    fc["edges"] = edges
    return fc, changes


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="Write changes (default: dry-run)")
    args = ap.parse_args()

    summary: dict[str, Any] = {"changed": 0, "unchanged": 0, "details": []}

    # Load the seed copy first (data/) to compute patches; we'll mirror to runtime.
    seed_path = TARGETS[0]
    if not seed_path.exists():
        print(f"missing {seed_path}", file=sys.stderr)
        return 1

    with seed_path.open(encoding="utf-8") as f:
        flowcharts = json.load(f)

    for fc in flowcharts:
        before_id = fc.get("id", "?")
        _, changes = apply_patch(fc)
        if changes:
            summary["changed"] += 1
            summary["details"].append({"id": before_id, "changes": changes})
        else:
            summary["unchanged"] += 1

    print(f"=== {'APPLIED' if args.apply else 'DRY-RUN'} ===")
    for d in summary["details"]:
        print(f"\n{d['id']}:")
        for c in d["changes"]:
            print(f"  - {c}")

    print(f"\nSummary: changed={summary['changed']}  unchanged={summary['unchanged']}")

    if args.apply and summary["changed"] > 0:
        for path in TARGETS:
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("w", encoding="utf-8") as f:
                json.dump(flowcharts, f, ensure_ascii=False, indent=2)
            print(f"  wrote {path.relative_to(ROOT)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
