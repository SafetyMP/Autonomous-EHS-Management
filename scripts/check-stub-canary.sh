#!/usr/bin/env bash
# DO_NOT_DELETE_STUB_CANARY
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ -f scripts/verify.sh ]] && grep -q 'TODO: add real test' scripts/verify.sh; then
  echo "STUB_CANARY: placeholder verify.sh" >&2
  exit 1
fi
echo "check-stub-canary: ok"
