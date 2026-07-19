#!/usr/bin/env bash
# Definition of Done — mirrors CI `verify` job (lint + tsc + vitest; no Postgres/e2e).
# Full e2e: CI `e2e-smoke` provisions Postgres + seed (see .github/workflows/ci.yml).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# Ensure local bins resolve under corp-harness evidence (sanitized PATH/HOME).
export PATH="${ROOT}/node_modules/.bin:${PATH}"

if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
  corepack prepare npm@10.9.2 --activate >/dev/null 2>&1 || true
fi

# corp-harness evidence children set RLIMIT_FSIZE≈1MB (see corp_harness.evidence);
# npm ci cannot unpack packages under that limit. Skip when node_modules already
# present and CORP_HARNESS_ALLOWED_HOST is set by the harness evidence runner.
if [[ -n "${CORP_HARNESS_ALLOWED_HOST:-}" && -d node_modules ]]; then
  echo "==> npm ci skipped (corp-harness evidence + existing node_modules)"
else
  echo "==> npm ci (expect packageManager npm@10.9.2)"
  npm ci
fi

echo "==> verify (lint + typecheck + unit tests)"
npm run verify

echo "==> audit matrix greps (ADR-S-003 R-008)"
npm run audit:matrix-greps

echo "verify: ok (ci/web parity; add DATABASE_URL + test:e2e:smoke for full QA)"

if [[ -f ./scripts/check-threat-model.sh ]]; then
  echo "==> threat model gate"
  bash ./scripts/check-threat-model.sh
fi
