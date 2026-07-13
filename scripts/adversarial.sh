#!/usr/bin/env bash
# Tier-3 adversarial oracle — unauthenticated inbound integration.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE="${ADVERSARIAL_BASE_URL:-http://localhost:3000}"

log() { echo ""; echo "== adversarial: $* =="; }

if ! curl -fsS "$BASE" >/dev/null 2>&1; then
  echo "App not running at $BASE — start dev server or run integration-e2e first" >&2
  exit 1
fi

# deny_case: anonymous_integration_inbound
log "anonymous_integration_inbound (expect 401)"
code=$(curl -s -o /tmp/ehs-adversarial.json -w "%{http_code}" \
  -X POST "$BASE/api/integration/inbound" \
  -H "Content-Type: application/json" \
  -d '{}')
[[ "$code" == "401" ]]
grep -qi 'Unauthorized' /tmp/ehs-adversarial.json
echo "  ${code} (as expected)"

echo ""
echo "adversarial: ok"
