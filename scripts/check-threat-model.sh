#!/usr/bin/env bash
# Validate threat-model artifact + adversarial tier for integration repos.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

errors=0
PROFILE="$(grep '^profile:' .harness/profile.yaml 2>/dev/null | awk '{print $2}' || echo solo)"
INTEGRATION_CMD="$(grep -A5 'commands:' .harness/profile.yaml 2>/dev/null | grep 'integration:' | head -1 | awk '{print $2}' || true)"

if [[ -z "$INTEGRATION_CMD" || "$INTEGRATION_CMD" == "null" ]]; then
  for candidate in scripts/demo.sh scripts/integration-e2e.sh scripts/integration-smoke.sh scripts/smoke-test.sh; do
    if [[ -f "$ROOT/$candidate" ]]; then
      INTEGRATION_CMD="./$candidate"
      break
    fi
  done
  if [[ -z "$INTEGRATION_CMD" ]]; then
    shopt -s nullglob
    for candidate in "$ROOT"/scripts/smoke-test*.sh; do
      INTEGRATION_CMD="./scripts/$(basename "$candidate")"
      break
    done
    shopt -u nullglob
  fi
fi

EXEMPT=0
case "$PROFILE" in
  harness-lab|eval) EXEMPT=1 ;;
esac
if [[ -z "$INTEGRATION_CMD" || "$INTEGRATION_CMD" == "null" ]]; then
  echo "check-threat-model: skip (no integration tier; profile=$PROFILE)"
  exit 0
fi
if [[ "$EXEMPT" -eq 1 ]]; then
  echo "check-threat-model: skip (exempt profile=$PROFILE)"
  exit 0
fi

echo "== threat-model: integration=$INTEGRATION_CMD profile=$PROFILE =="

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "MISSING: $path" >&2
    errors=$((errors + 1))
  fi
}

require_file "specs/threat-model.yaml"
if [[ ! -f docs/adr/0000-threat-model.md && ! -f specs/decisions/0000-threat-model.md ]]; then
  echo "MISSING: docs/adr/0000-threat-model.md or specs/decisions/0000-threat-model.md" >&2
  errors=$((errors + 1))
fi
require_file "scripts/adversarial.sh"

if ! grep -q 'adversarial:' .harness/profile.yaml; then
  echo "MISSING: requires.commands.adversarial in .harness/profile.yaml" >&2
  errors=$((errors + 1))
fi

echo "== threat-model: yaml schema =="
python3 - <<'PY' || errors=$((errors + 1))
import pathlib, re, sys

root = pathlib.Path(".")
text = (root / "specs/threat-model.yaml").read_text()
if "schema: threat-model/v1" not in text:
    print("BAD SCHEMA: specs/threat-model.yaml (want threat-model/v1)", file=sys.stderr)
    raise SystemExit(1)
cells_part = text.split("deny_cases:")[0]
cell_ids = re.findall(r"^\s*- id: (\S+)", cells_part, re.M)
deny_part = text.split("deny_cases:")[-1] if "deny_cases:" in text else ""
deny_ids = re.findall(r"^\s*- id: (\S+)", deny_part, re.M)
deny_cells = re.findall(r"^\s*cell: (\S+)", deny_part, re.M)
if not cell_ids or not deny_ids:
    print("EMPTY: cells or deny_cases", file=sys.stderr)
    raise SystemExit(1)
cell_set = set(cell_ids)
for cid in deny_cells:
    if cid not in cell_set:
        print(f"BAD deny_case cell: {cid!r}", file=sys.stderr)
        raise SystemExit(1)
adv = (root / "scripts/adversarial.sh").read_text()
for did in deny_ids:
    if did not in adv:
        print(f"TRACEABILITY: deny_case {did!r} not in adversarial.sh", file=sys.stderr)
        raise SystemExit(1)
print(f"yaml ok: {len(cell_ids)} cells, {len(deny_ids)} deny_cases")
PY

ADR=""
[[ -f docs/adr/0000-threat-model.md ]] && ADR="docs/adr/0000-threat-model.md"
[[ -z "$ADR" && -f specs/decisions/0000-threat-model.md ]] && ADR="specs/decisions/0000-threat-model.md"
if [[ -n "$ADR" ]]; then
  lower="$(tr '[:upper:]' '[:lower:]' < "$ADR")"
  for kw in principal "trust bound" authentication; do
    if ! grep -qi "$kw" <<< "$lower"; then
      echo "ADR-0000 missing keyword: $kw ($ADR)" >&2
      errors=$((errors + 1))
    fi
  done
fi

if [[ "$errors" -gt 0 ]]; then
  echo "check-threat-model: FAILED ($errors errors)" >&2
  exit 1
fi

echo "check-threat-model: ok"
