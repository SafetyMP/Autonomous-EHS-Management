#!/usr/bin/env bash
# Tier-3 adversarial oracle — executes specs/threat-model.yaml via run-adversarial.py.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

exec python3 "$ROOT/scripts/run-adversarial.py" "$@"
