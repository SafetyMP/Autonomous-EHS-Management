#!/usr/bin/env bash
# Root site gates for corporate handoff — requires live DB + no SKIP paths.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

set -a
# shellcheck disable=SC1091
source "$ROOT/.env.ci"
set +a

export DATABASE_URL="${DATABASE_URL:-postgresql://ci:ci@127.0.0.1:5433/ehs_ci}"
export DATABASE_USE_PG=1
export CI_E2E_USER_EMAIL="${CI_E2E_USER_EMAIL:?missing CI_E2E_USER_EMAIL}"
export CI_E2E_USER_PASSWORD="${CI_E2E_USER_PASSWORD:?missing CI_E2E_USER_PASSWORD}"
export PLAYWRIGHT_E2E_EMAIL="${PLAYWRIGHT_E2E_EMAIL:?missing PLAYWRIGHT_E2E_EMAIL}"
export PLAYWRIGHT_E2E_PASSWORD="${PLAYWRIGHT_E2E_PASSWORD:?missing PLAYWRIGHT_E2E_PASSWORD}"
export INTEGRATION_INBOUND_SECRET="${INTEGRATION_INBOUND_SECRET:?missing INTEGRATION_INBOUND_SECRET}"
export RATE_LIMIT_DISABLED="${RATE_LIMIT_DISABLED:-true}"
export FORCE_CRON_METRICS_SMOKE="${FORCE_CRON_METRICS_SMOKE:-1}"
export BETTER_AUTH_URL="${BETTER_AUTH_URL:-http://127.0.0.1:3000}"
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://127.0.0.1:3000}"
export ADVERSARIAL_BASE_URL="${ADVERSARIAL_BASE_URL:-http://127.0.0.1:3000}"
export CI=1

EVIDENCE="$ROOT/.corp-harness/evidence"
mkdir -p "$EVIDENCE"

echo "==> db:migrate"
npm run db:migrate
echo "==> db:seed:ci"
npm run db:seed:ci

echo "==> verify.sh"
./scripts/verify.sh 2>&1 | tee "$EVIDENCE/root-verify-rework.log"

echo "==> integration-e2e (no skip)"
./scripts/integration-e2e.sh 2>&1 | tee "$EVIDENCE/root-integration-e2e.log"

echo "==> build + adversarial (no skip)"
npm run build
# stop prior server if any
if lsof -tiTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  lsof -tiTCP:3000 -sTCP:LISTEN | xargs kill 2>/dev/null || true
  sleep 1
fi
PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js >"$EVIDENCE/adversarial-server.log" 2>&1 &
SERVER_PID=$!
cleanup() { kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT
for _ in $(seq 1 60); do
  curl -fsS http://127.0.0.1:3000 >/dev/null 2>&1 && break
  sleep 2
done
curl -fsS http://127.0.0.1:3000 >/dev/null
./scripts/adversarial.sh --scope full 2>&1 | tee "$EVIDENCE/root-adversarial.log"
echo "ALL_SITE_GATES_OK"
