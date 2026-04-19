#!/usr/bin/env bash
# Unattended batch runner. Calls run.py repeatedly until every task is done.
#
# - Exit code 0 from run.py means 0 errors → all done, stop looping
# - Exit code 3 means some parse failures, but not rate-limited → try local
#   repair + continue (minor failures usually self-heal on retry)
# - Exit code 4 means 3+ consecutive rate-limit hits → sleep long, then retry
# - Any other code → unknown failure; sleep short, retry, bail after N tries
#
# Usage:
#   scripts/enhance/watch.sh --plan-order --concurrency 3
#   scripts/enhance/watch.sh --dimension cn_guideline
#   scripts/enhance/watch.sh --target-type marker

set -u
cd "$(dirname "$0")/../.."

MAX_ITERATIONS=50
RATE_LIMIT_SLEEP=${RATE_LIMIT_SLEEP:-1800}  # 30 min default
SHORT_SLEEP=${SHORT_SLEEP:-60}              # 1 min for transient errors

iter=0
while [ "$iter" -lt "$MAX_ITERATIONS" ]; do
    iter=$((iter + 1))
    echo "=== watch iter $iter @ $(date -Iseconds) ==="

    python3 scripts/enhance/run.py "$@"
    rc=$?

    case "$rc" in
        0)
            echo "All tasks complete (rc=0). Stopping."
            exit 0
            ;;
        3)
            echo "rc=3 (some parse fails). Running local repair + continuing."
            python3 - <<'PY'
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
print(f'[watch] locally repaired: {n}')
PY
            sleep "$SHORT_SLEEP"
            ;;
        4)
            echo "rc=4 (rate limit triggered). Sleeping ${RATE_LIMIT_SLEEP}s."
            sleep "$RATE_LIMIT_SLEEP"
            ;;
        *)
            echo "rc=$rc (unknown). Sleeping ${SHORT_SLEEP}s."
            sleep "$SHORT_SLEEP"
            ;;
    esac
done

echo "Hit max iterations ($MAX_ITERATIONS). Check docs/enhancement-results/."
exit 1
