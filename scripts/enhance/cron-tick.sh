#!/usr/bin/env bash
# One "tick" of scheduled work. Designed to be invoked by cron every 30 min
# (or by daemon.sh in a loop).
#
# Behaviour:
#   - If another tick is still running  → skip silently (flock)
#   - If 0 tasks remaining               → write "done" heartbeat + exit 0
#   - Otherwise                          → run up to TICK_BATCH_SIZE tasks
#   - On rate-limit (run.py rc=4)        → exit cleanly; next tick retries
#   - On success with minor parse fails  → run local JSON repair, then exit
#
# Environment overrides:
#   TICK_BATCH_SIZE   (default 50)   how many tasks per tick
#   TICK_CONCURRENCY  (default 2)    parallel claude -p processes
#   TICK_ARGS         (default "--plan-order")  extra run.py args
#
# Heartbeat log: scripts/enhance/cron-tick.log — last 100 lines kept.
# Lock file:     /tmp/pathoatlas-enhance.lock

set -u

cd "$(dirname "$0")/../.." || exit 1

TICK_BATCH_SIZE="${TICK_BATCH_SIZE:-50}"
TICK_CONCURRENCY="${TICK_CONCURRENCY:-2}"
TICK_ARGS="${TICK_ARGS:---plan-order}"
LOCK=/tmp/pathoatlas-enhance.lock
LOG=scripts/enhance/cron-tick.log

log() {
    echo "[$(date -Iseconds)] $*" >> "$LOG"
}

# flock prevents overlapping ticks. -n = non-blocking, fail if locked.
exec 9>"$LOCK"
if ! flock -n 9; then
    log "SKIP — another tick is running"
    exit 0
fi

# How many tasks still need doing?
remaining=$(
    python3 - <<'PY'
import json, pathlib, sys
sys.path.insert(0, 'scripts/enhance')
from run import _is_task_done
with open('docs/enhancement-tasks.json') as f:
    tasks = json.load(f)['tasks']
print(sum(1 for t in tasks if not _is_task_done(t['taskId'])))
PY
)

if [ "$remaining" = "0" ]; then
    log "COMPLETE — 0 tasks remaining"
    exit 0
fi

log "TICK start — $remaining remaining, batch=$TICK_BATCH_SIZE"

python3 scripts/enhance/run.py \
    $TICK_ARGS \
    --limit "$TICK_BATCH_SIZE" \
    --concurrency "$TICK_CONCURRENCY" 2>&1 | tee -a "$LOG"
rc=${PIPESTATUS[0]}

log "TICK end rc=$rc"

case "$rc" in
    0)
        log "tick OK — all $TICK_BATCH_SIZE succeeded";;
    3)
        log "tick had parse fails — running local repair"
        python3 - <<'PY' 2>&1 | tee -a "$LOG"
import json, pathlib, sys
sys.path.insert(0, 'scripts/enhance')
from run import _extract_json
d = pathlib.Path('docs/enhancement-results')
n = 0
for f in d.glob('*.json'):
    r = json.load(f.open())
    if r.get('parseOk') or not r.get('rawText'): continue
    try:
        r['output'] = _extract_json(r['rawText'])
        r['parseOk'] = True; r['parseError'] = None
        r['_repairedLocally'] = True
        with f.open('w', encoding='utf-8') as fw:
            json.dump(r, fw, ensure_ascii=False, indent=2)
        n += 1
    except Exception: pass
print(f'locally repaired: {n}')
PY
        ;;
    4)
        log "RATE-LIMITED — exiting early. Next tick will retry.";;
    *)
        log "unknown exit rc=$rc";;
esac

# Truncate log to last 500 lines to keep disk usage bounded
if [ -f "$LOG" ]; then
    tail -n 500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi

exit 0  # never propagate errors — cron re-tries next tick
