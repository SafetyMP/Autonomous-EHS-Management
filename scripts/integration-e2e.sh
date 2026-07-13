#!/usr/bin/env bash
# Integration E2E — mirrors CI e2e-smoke job.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm run test:e2e:smoke
