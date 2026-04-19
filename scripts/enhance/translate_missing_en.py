"""Batch-translate missing English name/title/term fields.

Reads `docs/i18n-audit.json` (or regenerates it on the fly), groups gaps by
target file + parent path, batches into manageable chunks, and asks
`claude -p` for the English translations in one shot per chunk.

Writes back to BOTH data/ and data-runtime/ atomically with a backup
snapshot under `data-runtime/backups/i18n-<ts>/`.

Run from repo root:
    python3 scripts/enhance/translate_missing_en.py            # dry-run
    python3 scripts/enhance/translate_missing_en.py --apply    # write
    python3 scripts/enhance/translate_missing_en.py --apply --batch-size 30
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
AUDIT_JSON = ROOT / "docs" / "i18n-audit.json"
BACKUP_ROOT = ROOT / "data-runtime" / "backups"

MODEL = "claude-opus-4-7"
TIMEOUT_SECONDS = 180

SYSTEM_PROMPT = """你是病理学术语英文翻译专家，为 PathoAtlas 病理图谱项目补全英文字段。

输入：一个 JSON 数组，每项包含 zh（中文原文）+ context（出现位置）。
输出：相同长度的 JSON 数组，每项是 {"en": "..."} 对象。

翻译规则：
1. 病理学术语遵循 WHO Classification of Tumours 5th 与 NCI Thesaurus 标准
2. 标题用 Title Case；不要加引号、不要加冒号
3. 缩写保留原形（CSCO / NMPA / IHC / TBS）
4. 国内特有概念（如 CSCO 指南、CACA 共识）译时保留缩写本体
5. 课程模块标题等通用词保持简洁，不要过度翻译

示例输入：
[
  {"zh": "55 岁女性乳腺肿物", "context": "cases.json"},
  {"zh": "粉刺型 DCIS 案例", "context": "cases.json"},
  {"zh": "甲状腺乳头状癌形态拟态", "context": "differentials.json"}
]

示例输出：
[
  {"en": "55-Year-Old Woman with Breast Mass"},
  {"en": "Comedo-Type DCIS Case"},
  {"en": "Mimics of Papillary Thyroid Carcinoma"}
]

请只输出 JSON 数组，不要包裹 markdown 代码块。"""


def regenerate_audit() -> dict:
    """Re-run the auditor in-process to get fresh gap data."""
    print("Refreshing i18n-audit.json...", file=sys.stderr)
    subprocess.run(
        ["python3", str(ROOT / "scripts" / "enhance" / "i18n_audit.py")],
        check=True,
        cwd=ROOT,
    )
    with AUDIT_JSON.open(encoding="utf-8") as f:
        return json.load(f)


def call_claude_translate(items: list[dict]) -> list[str]:
    """Send a chunk to claude -p, parse back the English values."""
    user_prompt = json.dumps(
        [{"zh": it["zh"], "context": it["file"]} for it in items],
        ensure_ascii=False,
    )

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".txt", delete=False, encoding="utf-8"
    ) as sp_file:
        sp_file.write(SYSTEM_PROMPT)
        sp_path = sp_file.name

    try:
        proc = subprocess.run(
            [
                "claude", "-p",
                "--model", MODEL,
                "--system-prompt-file", sp_path,
                "--tools", "",
                "--no-session-persistence",
                "--output-format", "json",
                user_prompt,
            ],
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
        )
    finally:
        try:
            os.unlink(sp_path)
        except OSError:
            pass

    if proc.returncode != 0:
        raise RuntimeError(f"claude exited {proc.returncode}: {proc.stderr[:300]}")

    envelope = json.loads(proc.stdout)
    raw = (envelope.get("result") or "").strip()
    # Strip ```json fences if present
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw
        raw = raw.rsplit("```", 1)[0] if "```" in raw else raw
        raw = raw.strip()

    parsed = json.loads(raw)
    if not isinstance(parsed, list) or len(parsed) != len(items):
        raise ValueError(
            f"expected {len(items)} entries, got {len(parsed) if isinstance(parsed, list) else type(parsed)}"
        )
    return [p.get("en", "") if isinstance(p, dict) else "" for p in parsed]


def navigate_and_set(root: Any, path: str, en_key: str, en_value: str) -> bool:
    """Walk `path` (as emitted by i18n_audit) into `root` and set `en_key`.
    Returns True on success.

    Path examples:
      cases.json[3]           → root[3]
      curriculum.json.yearPaths[0].modules[2]
      cytology.json[7].categories[0]
    """
    # Strip leading "<file>" segment (everything up to first . or [ AFTER the .json)
    after_file = path.split(".json", 1)[1] if ".json" in path else path
    if after_file.startswith("."):
        after_file = after_file[1:]
    cursor = root
    # Tokenize: e.g. "yearPaths[0].modules[2]" → ["yearPaths","0","modules","2"]
    import re
    tokens = re.findall(r"[A-Za-z_][A-Za-z_0-9]*|\[(\d+)\]", after_file)
    # Re-extract properly: alternate keys and integer indices
    tokens = re.findall(r"([A-Za-z_][A-Za-z_0-9-]*)|\[(\d+)\]", after_file)
    for k, idx in tokens:
        if k:
            cursor = cursor.get(k) if isinstance(cursor, dict) else None
        else:
            i = int(idx)
            cursor = cursor[i] if isinstance(cursor, list) and i < len(cursor) else None
        if cursor is None:
            return False
    if not isinstance(cursor, dict):
        return False
    cursor[en_key] = en_value
    return True


def chunked(items: list, n: int):
    for i in range(0, len(items), n):
        yield items[i : i + n]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="Actually call API and write changes (default: list only)")
    ap.add_argument("--batch-size", type=int, default=20,
                    help="How many items per claude -p call (default 20)")
    ap.add_argument("--limit", type=int, default=0,
                    help="Process at most N items (0 = all)")
    args = ap.parse_args()

    audit = regenerate_audit() if not AUDIT_JSON.exists() else json.load(AUDIT_JSON.open(encoding="utf-8"))
    items = audit.get("items", [])
    if args.limit:
        items = items[: args.limit]

    if not items:
        print("Nothing to translate — i18n-audit reports zero gaps.")
        return 0

    print(f"Will translate {len(items)} items in {(len(items) + args.batch_size - 1) // args.batch_size} batches "
          f"(batch={args.batch_size}, model={MODEL})", file=sys.stderr)

    if not args.apply:
        for it in items[:10]:
            print(f"  [{it['pair']}] {it['file']}::{it['path']}  zh={it['zh']!r}")
        print(f"  ... (and {len(items) - 10} more)" if len(items) > 10 else "")
        print("\n[DRY-RUN] re-run with --apply to translate.")
        return 0

    # Group by file → load once, modify in memory, write atomically
    by_file: dict[str, list] = {}
    for it in items:
        by_file.setdefault(it["file"], []).append(it)

    # Set up backup snapshot
    ts = datetime.now().strftime("i18n-%Y%m%d-%H%M%S")
    backup_dir = BACKUP_ROOT / ts
    backup_dir.mkdir(parents=True, exist_ok=True)

    total_translated = total_failed = 0

    for file_rel, file_items in sorted(by_file.items()):
        if not file_rel.startswith("data/"):
            continue
        seed_path = ROOT / file_rel
        if not seed_path.exists():
            continue

        # Backup
        backup_dest = backup_dir / Path(file_rel)
        backup_dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(seed_path, backup_dest)

        with seed_path.open(encoding="utf-8") as f:
            data = json.load(f)

        print(f"\n--- {file_rel} ({len(file_items)} items) ---", file=sys.stderr)

        # Translate in batches
        for batch_idx, batch in enumerate(chunked(file_items, args.batch_size)):
            t0 = time.monotonic()
            try:
                translations = call_claude_translate(batch)
            except Exception as e:
                print(f"  batch {batch_idx + 1}: FAILED — {e}", file=sys.stderr)
                total_failed += len(batch)
                continue
            elapsed = time.monotonic() - t0

            applied = 0
            for it, en in zip(batch, translations):
                if not en:
                    continue
                en_key = it["pair"].split("/")[1]
                if navigate_and_set(data, it["path"], en_key, en):
                    applied += 1
                else:
                    print(f"    failed to set {it['path']} → {en_key}", file=sys.stderr)
            total_translated += applied
            print(f"  batch {batch_idx + 1}: +{applied}/{len(batch)} ({elapsed:.1f}s)",
                  file=sys.stderr)

        # Write back to BOTH data/ and data-runtime/
        rel_inner = Path(file_rel[len("data/"):])
        for abs_path in (seed_path, ROOT / "data-runtime" / rel_inner):
            tmp = abs_path.with_suffix(abs_path.suffix + ".tmp")
            try:
                with tmp.open("w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                    f.flush()
                    os.fsync(f.fileno())
                os.replace(tmp, abs_path)
            except Exception:
                if tmp.exists():
                    tmp.unlink()
                raise

    print(f"\nDone. translated={total_translated}  failed={total_failed}  "
          f"backup={backup_dir.relative_to(ROOT)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
