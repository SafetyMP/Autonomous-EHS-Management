#!/usr/bin/env bash
# Definition of Done — mirrors CI `verify` job (lint + tsc + vitest; no Postgres/e2e).
# Full e2e: CI `e2e-smoke` provisions Postgres + seed (see .github/workflows/ci.yml).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
  corepack prepare npm@10.9.2 --activate >/dev/null 2>&1 || true
fi

echo "==> npm ci (expect packageManager npm@10.9.2)"
npm ci

echo "==> verify (lint + typecheck + unit tests)"
npm run verify

echo "verify: ok (ci/web parity; add DATABASE_URL + test:e2e:smoke for full QA)"

if [[ -f ./scripts/check-threat-model.sh ]]; then
  echo "==> threat model gate"
  bash ./scripts/check-threat-model.sh
fi
