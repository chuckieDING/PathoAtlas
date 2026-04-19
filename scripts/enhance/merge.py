"""Merge enhancement results back into data/*.json.

Reads every `docs/enhancement-results/*.json` with `parseOk: true`, locates
the target record by `targetFile` + `targetId`, and merges the new fields.

Default is dry-run (shows diff). Pass `--apply` to write changes.

Merge strategy per dimension:
  - cn_guideline      → append to references (with [国内指南] prefix in title)
  - cn_consensus      → append to references (with [国内共识] prefix in title)
  - cn_literature     → markers[*].literature_cn (new field)
  - images            → replace images field if it has fewer entries currently
  - staining_image    → markers[*].stainingImages[stateId].images = output.images
  - expert_consensus_cn / molecular_cn_cdx / etc. → new dedicated fields

All new fields are namespaced (`*_cn`, `cnEpidemiology`, etc.) so they don't
collide with existing schema.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
RESULTS_DIR = ROOT / "docs" / "enhancement-results"
BACKUP_ROOT = ROOT / "data-runtime" / "backups"
REJECTIONS_FILE = ROOT / "docs" / "review-rejections.txt"


def _load_rejections() -> set[str]:
    """Read taskIds the reviewer marked as do-not-merge."""
    if not REJECTIONS_FILE.exists():
        return set()
    out = set()
    for line in REJECTIONS_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            out.add(line.split()[0])
    return out

# Per-invocation backup directory — set at first save, reused across saves
_BACKUP_DIR: Path | None = None


def _current_backup_dir() -> Path:
    """Lazy-init a single backup directory per merge run.

    Pattern: data-runtime/backups/20260418-233045/<rel-path>
    """
    global _BACKUP_DIR
    if _BACKUP_DIR is None:
        ts = datetime.now().strftime("%Y%m%d-%H%M%S")
        _BACKUP_DIR = BACKUP_ROOT / ts
        _BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    return _BACKUP_DIR


def load_data_file(rel_path: str) -> Any:
    with (ROOT / rel_path).open(encoding="utf-8") as f:
        return json.load(f)


def _atomic_write(target_abs: Path, obj: Any) -> None:
    """Atomic write helper: tmp file → fsync → rename."""
    target_abs.parent.mkdir(parents=True, exist_ok=True)
    tmp = target_abs.with_suffix(target_abs.suffix + ".tmp")
    try:
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, target_abs)
    except Exception:
        if tmp.exists():
            tmp.unlink()
        raise


def save_data_file(rel_path: str, obj: Any) -> None:
    """Atomic write: backup original → write `data/` AND `data-runtime/`.

    The app reads from `data-runtime/` (which is seeded from `data/` on
    first run, then admin edits accumulate there). To keep both in sync
    after enhancement, we write the same payload to both locations.

    Original `data/` file is backed up to `data-runtime/backups/<ts>/`
    for rollback.
    """
    target_rel = Path(rel_path)              # e.g. data/diseases/x.json
    seed_abs = ROOT / target_rel
    runtime_abs = ROOT / "data-runtime" / target_rel.relative_to("data")

    # 1. Back up seed copy (if exists)
    if seed_abs.exists():
        backup_dest = _current_backup_dir() / target_rel
        backup_dest.parent.mkdir(parents=True, exist_ok=True)
        if not backup_dest.exists():
            shutil.copy2(seed_abs, backup_dest)

    # 2. Write to seed dir
    _atomic_write(seed_abs, obj)

    # 3. Mirror to runtime dir (so the app sees changes immediately)
    _atomic_write(runtime_abs, obj)


def find_record(data: Any, target_id: str) -> dict | None:
    """Find a record by id in a list[dict] or dict-of-list shape."""
    if isinstance(data, list):
        for rec in data:
            if isinstance(rec, dict) and rec.get("id") == target_id:
                return rec
    elif isinstance(data, dict):
        # Nested shapes e.g. panel-builder.json / curriculum.json
        if "::" in target_id:
            group, inner = target_id.split("::", 1)
            group_list = data.get(group, [])
            if isinstance(group_list, list):
                for rec in group_list:
                    if isinstance(rec, dict) and rec.get("id") == inner:
                        return rec
    return None


# --------------- per-dimension merge handlers ---------------
def merge_cn_guideline(rec: dict, output: dict) -> list[str]:
    changes = []
    refs = rec.setdefault("references", [])
    for g in output.get("references_cn_guideline", []) or []:
        title = g.get("title")
        if not title:
            continue
        formatted = f"[国内指南] {title} ({g.get('org', '')}, {g.get('year', '')})"
        if formatted not in refs:
            refs.append(formatted)
            changes.append(f"+ref {formatted}")
    return changes


def merge_cn_consensus(rec: dict, output: dict) -> list[str]:
    changes = []
    refs = rec.setdefault("references", [])
    for c in output.get("references_cn_consensus", []) or []:
        title = c.get("title")
        if not title:
            continue
        formatted = f"[国内共识] {title} ({c.get('org', '')}, {c.get('year', '')})"
        if formatted not in refs:
            refs.append(formatted)
            changes.append(f"+ref {formatted}")
    # For markers: also append to expertConsensus if present
    for c in output.get("expertConsensus_cn", []) or []:
        ec = rec.setdefault("expertConsensus", [])
        if not any(x.get("title") == c.get("title") for x in ec):
            ec.append(c)
            changes.append(f"+expertConsensus {c.get('title')}")
    return changes


def merge_cn_literature(rec: dict, output: dict) -> list[str]:
    changes = []
    existing = rec.setdefault("literature", [])
    for lit in output.get("literature_cn", []) or []:
        title = lit.get("title")
        if not title:
            continue
        if not any(x.get("title") == title for x in existing):
            existing.append(lit)
            changes.append(f"+literature {title}")
    return changes


def merge_images(rec: dict, output: dict) -> list[str]:
    new_imgs = output.get("images", []) or []
    if not new_imgs:
        return []
    rec.setdefault("images", [])
    # Avoid duplicating by caption
    existing_captions = {img.get("caption") for img in rec["images"]}
    added = 0
    for img in new_imgs:
        if img.get("caption") not in existing_captions:
            rec["images"].append(img)
            added += 1
    return [f"+{added} images"] if added else []


def merge_description_expand(rec: dict, output: dict) -> list[str]:
    new_micro = output.get("microscopy")
    if not new_micro or len(new_micro) < 200:
        return []
    old_len = len(rec.get("microscopy", ""))
    if len(new_micro) > old_len * 1.2:
        rec["microscopy"] = new_micro
        return [f"microscopy {old_len} → {len(new_micro)} chars"]
    return []


def merge_staining_image(rec: dict, output: dict, staining_state_id: str) -> list[str]:
    for si in rec.get("stainingImages", []):
        if si.get("id") == staining_state_id:
            new_imgs = output.get("images", []) or []
            if new_imgs:
                si["images"] = new_imgs
                return [f"stainingImages[{staining_state_id}] +{len(new_imgs)} imgs"]
    return []


def merge_generic_namespaced(rec: dict, output: dict, dimension: str) -> list[str]:
    """For dimensions that don't have a bespoke handler: write the output as
    a new namespaced field keyed by dimension.
    """
    if not output:
        return []
    key = f"_enhance_{dimension}"
    rec[key] = output
    return [f"+{key}"]


HANDLERS = {
    "cn_guideline": merge_cn_guideline,
    "cn_consensus": merge_cn_consensus,
    "cn_literature": merge_cn_literature,
    "images": merge_images,
    "description_expand": merge_description_expand,
}


def apply_result(result: dict, apply: bool) -> tuple[str, list[str]]:
    dim = result["dimension"]
    target_file = result.get("targetFile")
    target_id = result.get("targetId")
    output = result.get("output") or {}

    if not target_file or not target_id:
        return f"{result['taskId']}: skipped (no targetFile/targetId)", []

    data = load_data_file(target_file)
    rec = find_record(data, target_id)
    if rec is None:
        return f"{result['taskId']}: record not found in {target_file}::{target_id}", []

    if dim == "staining_image":
        changes = merge_staining_image(
            rec, output, staining_state_id=result.get("stainingStateId") or ""
        )
    elif dim in HANDLERS:
        changes = HANDLERS[dim](rec, output)
    else:
        changes = merge_generic_namespaced(rec, output, dim)

    if apply and changes:
        save_data_file(target_file, data)

    return f"{result['taskId']} [{dim}] {target_file}::{target_id}", changes


def list_backups() -> int:
    if not BACKUP_ROOT.exists():
        print("No backups yet.")
        return 0
    backups = sorted(BACKUP_ROOT.iterdir(), reverse=True)
    for b in backups:
        if not b.is_dir():
            continue
        files = list(b.rglob("*.json"))
        print(f"{b.name}  ({len(files)} files)")
        for f in files[:5]:
            print(f"    {f.relative_to(b)}")
        if len(files) > 5:
            print(f"    ... and {len(files) - 5} more")
    return 0


def rollback(backup_id: str, dry_run: bool) -> int:
    """Restore all files from a given backup directory."""
    target_dir = (
        BACKUP_ROOT / backup_id if backup_id != "latest" else None
    )
    if backup_id == "latest":
        backups = sorted(
            [p for p in BACKUP_ROOT.iterdir() if p.is_dir()], reverse=True
        )
        if not backups:
            print("No backups found.", file=sys.stderr)
            return 1
        target_dir = backups[0]

    if not target_dir.exists():
        print(f"Backup '{backup_id}' not found at {target_dir}", file=sys.stderr)
        return 1

    restored = 0
    for backup_file in target_dir.rglob("*.json"):
        rel = backup_file.relative_to(target_dir)
        dest = ROOT / rel
        print(f"{'[DRY-RUN] ' if dry_run else ''}restore {rel}")
        if not dry_run:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(backup_file, dest)
        restored += 1

    tag = "DRY-RUN" if dry_run else "RESTORED"
    print(
        f"\n[{tag}] {restored} files from {target_dir.name}",
        file=sys.stderr,
    )
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="Actually write changes")
    ap.add_argument("--task-ids", help="Comma-separated taskId filter")
    ap.add_argument("--list-backups", action="store_true",
                    help="List available backup snapshots and exit")
    ap.add_argument("--rollback", metavar="BACKUP_ID",
                    help='Restore files from a backup (ID from --list-backups, '
                         'or "latest")')
    ap.add_argument("--rollback-dry-run", action="store_true",
                    help="Show what rollback would do, don't modify files")
    args = ap.parse_args()

    if args.list_backups:
        return list_backups()
    if args.rollback:
        return rollback(args.rollback, args.rollback_dry_run or not args.apply)

    if not RESULTS_DIR.exists():
        print("No results directory yet. Run run.py first.", file=sys.stderr)
        return 1

    task_filter = (
        set(s.strip() for s in args.task_ids.split(",")) if args.task_ids else None
    )
    rejections = _load_rejections()
    result_files = sorted(RESULTS_DIR.glob("*.json"))
    total = applied = rejected = 0

    for rf in result_files:
        with rf.open(encoding="utf-8") as f:
            result = json.load(f)
        if not result.get("parseOk"):
            continue
        if task_filter and result.get("taskId") not in task_filter:
            continue
        if result.get("taskId") in rejections:
            rejected += 1
            continue
        header, changes = apply_result(result, args.apply)
        total += 1
        if changes:
            applied += 1
            print(header)
            for c in changes:
                print(f"  {c}")

    tag = "APPLIED" if args.apply else "DRY-RUN"
    print(f"\n[{tag}] processed {total} results, {applied} with changes "
          f"(skipped {rejected} rejected)", file=sys.stderr)
    if args.apply and _BACKUP_DIR is not None:
        rel = _BACKUP_DIR.relative_to(ROOT)
        print(f"Backup saved to: {rel}  (use --rollback {_BACKUP_DIR.name} "
              f"to undo)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
