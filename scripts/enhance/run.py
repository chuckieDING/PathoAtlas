"""Batch enhancement runner — powered by Claude Code CLI (Pro/Max subscription).

Uses `claude -p` in headless JSON mode instead of the Anthropic SDK, so
requests are billed against your Claude subscription rather than an API key.

Pre-flight:
  - `claude auth status` must show loggedIn: true
  - No ANTHROPIC_API_KEY needed

Each task:
  1. System prompt (per-dimension, ~4500 tokens) → written to temp file
  2. `claude -p --system-prompt-file <tmp> --model claude-opus-4-7
       --tools "" --no-session-persistence --output-format json <user_prompt>`
  3. Parse stdout JSON → extract `.result` (model text) + `.usage`
  4. Write `docs/enhancement-results/<taskId>.json`

Usage:
    python3 scripts/enhance/run.py --dimension cn_guideline --limit 5
    python3 scripts/enhance/run.py --target-type marker --concurrency 3
    python3 scripts/enhance/run.py --plan-order --limit 20
    python3 scripts/enhance/run.py --dry-run --limit 2
"""

from __future__ import annotations

import argparse
import concurrent.futures as futures
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Iterable

from prompts import build_system_prompt, build_user_prompt

ROOT = Path(__file__).resolve().parents[2]
TASKS_FILE = ROOT / "docs" / "enhancement-tasks.json"
RESULTS_DIR = ROOT / "docs" / "enhancement-results"

MODEL = "claude-opus-4-7"
TIMEOUT_SECONDS = 240  # per-task hard cap


def load_tasks() -> list[dict]:
    with TASKS_FILE.open(encoding="utf-8") as f:
        return json.load(f)["tasks"]


def _is_task_done(task_id: str) -> bool:
    """A task counts as done only if its result file exists AND parseOk=True.

    Error files or parse-failed files should be re-run on the next
    invocation, making the whole pipeline idempotently resumable.
    """
    p = _result_path(task_id)
    if not p.exists():
        return False
    try:
        with p.open(encoding="utf-8") as f:
            return bool(json.load(f).get("parseOk"))
    except (OSError, json.JSONDecodeError):
        return False


def filter_tasks(
    tasks: list[dict],
    dimension: str | None,
    target_type: str | None,
    task_ids: set[str] | None,
    skip_done: bool,
) -> list[dict]:
    out = tasks
    if dimension:
        out = [t for t in out if t.get("dimension") == dimension]
    if target_type:
        out = [t for t in out if t.get("targetType") == target_type]
    if task_ids:
        out = [t for t in out if t.get("taskId") in task_ids]
    if skip_done:
        out = [t for t in out if not _is_task_done(t["taskId"])]
    return out


# Substrings that signal "you hit a usage/rate limit, wait a while"
RATE_LIMIT_MARKERS = (
    "usage limit", "rate limit", "rate_limit",
    "5-hour limit", "weekly limit", "429",
    "quota", "too many requests", "try again in",
    "Your limit will reset",
)


def _looks_like_rate_limit(stderr: str, stdout: str) -> bool:
    blob = (stderr + "\n" + stdout).lower()
    return any(m.lower() in blob for m in RATE_LIMIT_MARKERS)


def _result_path(task_id: str) -> Path:
    return RESULTS_DIR / f"{task_id}.json"


def _repair_inner_quotes(s: str) -> str:
    """Best-effort repair: when a JSON string value contains unescaped ASCII
    double-quotes like `...foo"bar"baz...` that aren't followed by a valid
    JSON delimiter (`,`, `}`, `]`, `:`), convert them to Chinese curly quotes.

    We walk the string tracking whether we're inside a JSON string (between
    `"` pairs at structural level). A `"` is treated as structural only when
    immediately followed by whitespace + `,`/`}`/`]`/`:` or EOF.
    """
    out = []
    in_string = False
    i = 0
    n = len(s)
    while i < n:
        ch = s[i]
        if ch == "\\" and in_string and i + 1 < n:
            out.append(ch)
            out.append(s[i + 1])
            i += 2
            continue
        if ch == '"':
            if not in_string:
                in_string = True
                out.append(ch)
                i += 1
                continue
            # Inside a string — is this a real closer? Look ahead.
            j = i + 1
            while j < n and s[j] in " \t\n":
                j += 1
            if j >= n or s[j] in ",}]:":
                in_string = False
                out.append(ch)
            else:
                # Inner unescaped quote — convert to Chinese curly quote
                # Pick opening vs closing based on neighboring whitespace
                prev = s[i - 1] if i > 0 else ""
                if prev in " \t\n（(（":
                    out.append("\u201C")  # 左双引号 "
                else:
                    out.append("\u201D")  # 右双引号 "
            i += 1
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def _extract_json(text: str) -> Any:
    """Extract the first JSON object/array from a text response.

    Order of attempts:
      1. Direct json.loads on stripped text
      2. Strip ```json fences, try again
      3. Slice between first `{`/`[` and last `}`/`]`, try again
      4. Run _repair_inner_quotes on the slice, try again
    """
    s = text.strip()
    fence = re.search(r"```(?:json)?\s*(.+?)\s*```", s, re.DOTALL)
    if fence:
        s = fence.group(1).strip()
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        pass
    for opener in ("{", "["):
        idx = s.find(opener)
        if idx != -1:
            closer = "}" if opener == "{" else "]"
            last = s.rfind(closer)
            if last > idx:
                sliced = s[idx : last + 1]
                try:
                    return json.loads(sliced)
                except json.JSONDecodeError:
                    pass
                # Last resort A: repair inner unescaped quotes
                try:
                    repaired = _repair_inner_quotes(sliced)
                    return json.loads(repaired)
                except json.JSONDecodeError:
                    pass
                # Last resort B: close truncated JSON by appending missing
                # `}`/`]` (model hit max_tokens mid-structure)
                closed = _close_truncated(sliced)
                if closed != sliced:
                    try:
                        return json.loads(closed)
                    except json.JSONDecodeError:
                        try:
                            return json.loads(
                                _repair_inner_quotes(closed)
                            )
                        except json.JSONDecodeError:
                            pass
                continue
    raise ValueError(f"No valid JSON found in response: {s[:200]}...")


def _close_truncated(s: str) -> str:
    """If the JSON appears truncated (unbalanced brackets), try appending
    enough `}`/`]` to close it. Walks the string tracking structural depth
    while honoring quoting and escapes.
    """
    depth_obj = depth_arr = 0
    in_string = False
    i = 0
    n = len(s)
    stack: list[str] = []
    while i < n:
        ch = s[i]
        if in_string:
            if ch == "\\" and i + 1 < n:
                i += 2
                continue
            if ch == '"':
                in_string = False
            i += 1
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            stack.append("}")
        elif ch == "[":
            stack.append("]")
        elif ch in "}]":
            if stack and stack[-1] == ch:
                stack.pop()
        i += 1
    if in_string:
        # Truncated mid-string; close it + walk stack
        s = s + '"'
    return s + "".join(reversed(stack))


def run_task_via_cli(task: dict) -> dict:
    """Invoke `claude -p` for one task. Returns a normalized result record."""
    system_prompt = build_system_prompt(task["dimension"])
    user_prompt = build_user_prompt(task)

    # Write system prompt to a temp file (too long for a CLI arg).
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".txt", delete=False, encoding="utf-8"
    ) as sp_file:
        sp_file.write(system_prompt)
        sp_path = sp_file.name

    cmd = [
        "claude", "-p",
        "--model", MODEL,
        "--system-prompt-file", sp_path,
        "--tools", "",                     # no tools — pure LLM call
        "--no-session-persistence",
        "--output-format", "json",
        user_prompt,
    ]

    t0 = time.monotonic()
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return {
            "taskId": task["taskId"],
            "dimension": task["dimension"],
            "targetType": task["targetType"],
            "targetId": task.get("targetId"),
            "targetFile": task.get("targetFile"),
            "error": f"timeout after {TIMEOUT_SECONDS}s",
            "parseOk": False,
        }
    finally:
        try:
            os.unlink(sp_path)
        except OSError:
            pass

    elapsed = time.monotonic() - t0

    if proc.returncode != 0:
        rec = {
            "taskId": task["taskId"],
            "dimension": task["dimension"],
            "targetType": task["targetType"],
            "targetId": task.get("targetId"),
            "targetFile": task.get("targetFile"),
            "error": f"claude exited {proc.returncode}: {proc.stderr[:500]}",
            "parseOk": False,
            "elapsedSeconds": round(elapsed, 2),
        }
        if _looks_like_rate_limit(proc.stderr, proc.stdout):
            rec["rateLimited"] = True
        return rec

    try:
        envelope = json.loads(proc.stdout)
    except json.JSONDecodeError as e:
        return {
            "taskId": task["taskId"],
            "error": f"envelope json parse: {e}",
            "rawStdout": proc.stdout[:800],
            "parseOk": False,
        }

    raw_text = envelope.get("result") or ""

    # Pull out the per-request usage. Claude Code's JSON envelope puts it
    # under "usage" (aggregate tokens) and "modelUsage" (per model).
    usage = envelope.get("usage") or {}
    record: dict[str, Any] = {
        "taskId": task["taskId"],
        "dimension": task["dimension"],
        "targetType": task["targetType"],
        "targetId": task.get("targetId"),
        "targetFile": task.get("targetFile"),
        "stainingStateId": task.get("stainingStateId"),
        "model": MODEL,
        "elapsedSeconds": round(elapsed, 2),
        "ccDurationMs": envelope.get("duration_ms"),
        "stopReason": envelope.get("stop_reason"),
        "sessionId": envelope.get("session_id"),
        "totalCostUsd": envelope.get("total_cost_usd"),
        "usage": {
            "input_tokens": usage.get("input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0),
            "cache_creation_input_tokens":
                usage.get("cache_creation_input_tokens", 0),
            "cache_read_input_tokens":
                usage.get("cache_read_input_tokens", 0),
        },
        "rawText": raw_text,
    }

    try:
        record["output"] = _extract_json(raw_text)
        record["parseOk"] = True
    except ValueError as e:
        record["parseError"] = str(e)
        record["parseOk"] = False

    return record


def write_result(record: dict) -> Path:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    path = _result_path(record["taskId"])
    with path.open("w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)
    return path


def chunked(it: Iterable, n: int):
    buf = []
    for x in it:
        buf.append(x)
        if len(buf) >= n:
            yield buf
            buf = []
    if buf:
        yield buf


def check_auth() -> str | None:
    """Verify claude CLI is logged in. Return error string or None."""
    try:
        out = subprocess.run(
            ["claude", "auth", "status"],
            capture_output=True, text=True, timeout=10,
        )
    except FileNotFoundError:
        return "`claude` CLI not found. Install Claude Code first."
    except subprocess.TimeoutExpired:
        return "`claude auth status` timed out"
    if out.returncode != 0:
        return f"auth check failed: {out.stderr.strip()}"
    try:
        status = json.loads(out.stdout)
    except json.JSONDecodeError:
        return f"unexpected auth status output: {out.stdout[:200]}"
    if not status.get("loggedIn"):
        return "Not logged in. Run: claude auth login"
    return None


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Run enhancement tasks via Claude Code CLI "
                    "(Pro/Max subscription, no API key required).",
    )
    ap.add_argument("--dimension", help="Filter by task.dimension")
    ap.add_argument("--target-type", help="Filter by task.targetType")
    ap.add_argument("--task-ids", help="Comma-separated taskId list")
    ap.add_argument("--limit", type=int, default=0,
                    help="Max tasks to run (0 = all)")
    ap.add_argument("--concurrency", type=int, default=1,
                    help="Parallel claude -p processes (watch rate limits)")
    ap.add_argument("--redo", action="store_true",
                    help="Re-run tasks even if a result file exists")
    ap.add_argument("--dry-run", action="store_true",
                    help="Print prompts, don't invoke claude")
    ap.add_argument("--plan-order", action="store_true",
                    help="Sort tasks by score from docs/enhancement-plan.json")
    args = ap.parse_args()

    tasks = load_tasks()
    task_ids = (
        set(s.strip() for s in args.task_ids.split(",")) if args.task_ids else None
    )
    selected = filter_tasks(
        tasks,
        dimension=args.dimension,
        target_type=args.target_type,
        task_ids=task_ids,
        skip_done=not args.redo,
    )

    if args.plan_order:
        plan_file = ROOT / "docs" / "enhancement-plan.json"
        if plan_file.exists():
            with plan_file.open(encoding="utf-8") as f:
                plan = json.load(f)
            score_by_id = {
                t["taskId"]: t["score"]
                for t in plan.get("scoredTasks", [])
            }
            selected.sort(key=lambda t: -score_by_id.get(t["taskId"], 0))
        else:
            print("warn: --plan-order given but docs/enhancement-plan.json "
                  "missing. Run plan.py first.", file=sys.stderr)

    if args.limit:
        selected = selected[: args.limit]

    if not selected:
        print("No tasks matched. Use --redo to re-run completed tasks.",
              file=sys.stderr)
        return 1

    print(f"Selected {len(selected)} task(s). Model: {MODEL} via Claude Code",
          file=sys.stderr)

    if args.dry_run:
        for t in selected[:3]:
            print("=" * 60)
            print(f"taskId={t['taskId']}  dimension={t['dimension']}")
            print("--- SYSTEM (truncated) ---")
            print(build_system_prompt(t["dimension"])[:400])
            print("[... system prompt continues ...]")
            print("--- USER ---")
            print(build_user_prompt(t))
        if len(selected) > 3:
            print(f"\n... and {len(selected) - 3} more", file=sys.stderr)
        return 0

    # Verify login once before kicking off
    auth_err = check_auth()
    if auth_err:
        print(f"ERROR: {auth_err}", file=sys.stderr)
        return 2

    ok = err = 0
    total_in = total_out = total_cache_read = total_cache_write = 0
    total_usd = 0.0

    def _run_one(task: dict) -> tuple[bool, dict]:
        try:
            rec = run_task_via_cli(task)
            write_result(rec)
            return rec.get("parseOk", False), rec
        except Exception as e:  # noqa: BLE001
            err_rec = {
                "taskId": task["taskId"],
                "error": f"{type(e).__name__}: {e}",
                "parseOk": False,
            }
            write_result(err_rec)
            return False, err_rec

    if args.concurrency <= 1:
        iterator = (_run_one(t) for t in selected)
    else:
        pool = futures.ThreadPoolExecutor(max_workers=args.concurrency)
        iterator = pool.map(_run_one, selected)

    # Early-abort counter: N consecutive rate-limit errors → stop the batch
    # cleanly so the subscription window can recover. User re-runs the same
    # command later; already-done tasks are skipped automatically.
    consecutive_rate_limits = 0
    RATE_LIMIT_ABORT_AT = 3

    for i, (parse_ok, rec) in enumerate(iterator, 1):
        if "error" in rec and "usage" not in rec:
            err += 1
            marker = " RATE-LIMITED" if rec.get("rateLimited") else ""
            print(f"[{i}/{len(selected)}] {rec['taskId']} ERROR{marker}: "
                  f"{rec['error']}", file=sys.stderr)
            if rec.get("rateLimited"):
                consecutive_rate_limits += 1
                if consecutive_rate_limits >= RATE_LIMIT_ABORT_AT:
                    print(
                        f"\n[ABORT] {RATE_LIMIT_ABORT_AT} consecutive rate-limit "
                        f"errors — stopping batch.\nSubscription window likely "
                        f"exhausted. Re-run the same command later (already-done "
                        f"tasks will be skipped):\n  python3 scripts/enhance/"
                        f"run.py {' '.join(sys.argv[1:])}",
                        file=sys.stderr,
                    )
                    return 4
            continue
        consecutive_rate_limits = 0
        if parse_ok:
            ok += 1
        else:
            err += 1
        u = rec.get("usage") or {}
        total_in += u.get("input_tokens", 0)
        total_out += u.get("output_tokens", 0)
        total_cache_read += u.get("cache_read_input_tokens", 0)
        total_cache_write += u.get("cache_creation_input_tokens", 0)
        total_usd += rec.get("totalCostUsd") or 0.0
        tag = "OK" if parse_ok else "PARSE_FAIL"
        print(
            f"[{i}/{len(selected)}] {rec['taskId']} {tag} "
            f"in={u.get('input_tokens')} out={u.get('output_tokens')} "
            f"cache_r={u.get('cache_read_input_tokens')} "
            f"cache_w={u.get('cache_creation_input_tokens')} "
            f"${rec.get('totalCostUsd', 0):.3f} "
            f"{rec.get('elapsedSeconds')}s",
            file=sys.stderr,
        )

    print(
        f"\nDone. ok={ok} err={err} | "
        f"input={total_in} output={total_out} "
        f"cache_read={total_cache_read} cache_write={total_cache_write} | "
        f"reported cost (subscription-billed): ${total_usd:.2f}",
        file=sys.stderr,
    )
    return 0 if err == 0 else 3


if __name__ == "__main__":
    sys.exit(main())
