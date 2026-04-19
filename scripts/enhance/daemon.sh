#!/usr/bin/env bash
# Standalone daemon: runs cron-tick.sh every 30 minutes until all tasks done.
#
# Good when you don't want to set up cron. Just run it (in tmux / nohup) and
# walk away.
#
# Usage:
#   scripts/enhance/daemon.sh                       # plan-order, defaults
#   TICK_BATCH_SIZE=30 scripts/enhance/daemon.sh    # smaller batches
#   scripts/enhance/daemon.sh --dimension cn_guideline
#
# Environment overrides:
#   TICK_INTERVAL_SEC  (default 1800 = 30 min)

set -u

INTERVAL="${TICK_INTERVAL_SEC:-1800}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export TICK_ARGS="--plan-order $*"

echo "[$(date -Iseconds)] daemon started (interval=${INTERVAL}s, args=\"$TICK_ARGS\")"

while true; do
    "$SCRIPT_DIR/cron-tick.sh"

    # Are we done?
    remaining=$(
        cd "$SCRIPT_DIR/../.." && python3 - <<'PY'
import json, sys
sys.path.insert(0, 'scripts/enhance')
from run import _is_task_done
with open('docs/enhancement-tasks.json') as f:
    tasks = json.load(f)['tasks']
print(sum(1 for t in tasks if not _is_task_done(t['taskId'])))
PY
    )

    if [ "$remaining" = "0" ]; then
        echo "[$(date -Iseconds)] DONE — 0 tasks remaining. Daemon exiting."
        exit 0
    fi

    echo "[$(date -Iseconds)] $remaining tasks left · sleeping ${INTERVAL}s"
    sleep "$INTERVAL"
done
