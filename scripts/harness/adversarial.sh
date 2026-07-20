#!/usr/bin/env bash
# Tier-3 adversarial oracle — executes specs/threat-model.yaml via run-adversarial.py.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
export ADVERSARIAL_BASE_URL="${ADVERSARIAL_BASE_URL:-http://127.0.0.1:3000}"

exec python3 "$ROOT/scripts/run-adversarial.py" "$@"
