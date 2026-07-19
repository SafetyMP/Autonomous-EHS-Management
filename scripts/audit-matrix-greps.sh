#!/usr/bin/env bash
# Matches methodology in docs/qa/mutation-auditability-matrix.md (ADR-S-003 / R-008).
# Prefers ripgrep (`rg`); falls back to find(1)+grep(1) when rg is missing.
#
# Exit codes:
#   0 — inventory printed; every router with `.mutation(` has `writeAuditLog` in-file
#       or is listed in ONE_HOP_ALLOWLIST below
#   1 — one or more unaudited mutation routers (CI fail)
set -euo pipefail
cd "$(dirname "$0")/.."

# Documented one-hop callees: router file has `.mutation(` but delegates writeAuditLog
# to a service (no in-file call). Paths are relative to repo root.
# Keep in sync with docs/qa/mutation-auditability-matrix.md (Core-spine / Y notes).
# Example (currently unused — approval.ts audits decide in-router):
#   ONE_HOP_ALLOWLIST=(
#     "src/server/trpc/routers/example.ts|src/server/services/exampleAudited.ts"
#   )
ONE_HOP_ALLOWLIST=()

HAVE_RG=0
if command -v rg >/dev/null 2>&1; then
  HAVE_RG=1
fi

grep_ts_files () {
  local dir="$1"
  local pattern="$2"
  if [[ "$HAVE_RG" -eq 1 ]]; then
    rg -n "$pattern" "$dir" --glob '*.ts' || true
    return 0
  fi
  if [[ ! -d "$dir" ]]; then
    return 0
  fi
  find "$dir" -type f -name '*.ts' -print0 2>/dev/null | xargs -0 grep -En "$pattern" 2>/dev/null || true
}

list_router_files () {
  if [[ "$HAVE_RG" -eq 1 ]]; then
    rg --files -g '*.ts' src/server/trpc/routers | sort
    return 0
  fi
  find src/server/trpc/routers -type f -name '*.ts' | sort 2>/dev/null || true
}

file_has_pattern () {
  local file="$1"
  local pattern="$2"
  if [[ "$HAVE_RG" -eq 1 ]]; then
    rg -q "$pattern" "$file" --glob '*.ts'
    return $?
  fi
  grep -Eq "$pattern" "$file"
}

is_one_hop_allowed () {
  local file="$1"
  local entry
  for entry in "${ONE_HOP_ALLOWLIST[@]+"${ONE_HOP_ALLOWLIST[@]}"}"; do
    local router_path="${entry%%|*}"
    if [[ "$file" == "$router_path" ]]; then
      local callee="${entry#*|}"
      if [[ -f "$callee" ]] && file_has_pattern "$callee" 'writeAuditLog'; then
        return 0
      fi
      echo "audit-matrix-greps: FAIL — one-hop allowlist entry for $router_path missing writeAuditLog in $callee" >&2
      return 1
    fi
  done
  return 1
}

if [[ "$HAVE_RG" -eq 0 ]]; then
  echo "audit-matrix-greps: note — ripgrep (rg) not found; using find+grep fallback (same intent, slower)." >&2
fi

echo "=== tRPC router modules ==="
list_router_files

echo ""
echo "=== writeAuditLog under src/server/trpc/routers ==="
grep_ts_files src/server/trpc/routers writeAuditLog

echo ""
echo "=== .mutation( under src/server/trpc/routers ==="
grep_ts_files src/server/trpc/routers '\.mutation\('

echo ""
echo "=== writeAuditLog under src/app/api (delegates to services) ==="
grep_ts_files src/app/api writeAuditLog

echo ""
echo "=== writeAuditLog in contextSync + integration train services (sample) ==="
grep_ts_files src/server/services/contextSync writeAuditLog
if [[ "$HAVE_RG" -eq 1 ]]; then
  rg -n 'writeAuditLog' src/server/services/trainingCompletionIngest.ts || true
  rg -n 'writeAuditLog' src/server/services/hrisMembershipSyncIngest.ts || true
else
  grep -n 'writeAuditLog' src/server/services/trainingCompletionIngest.ts || true
  grep -n 'writeAuditLog' src/server/services/hrisMembershipSyncIngest.ts || true
fi

echo ""
echo "=== Gate: .mutation( requires writeAuditLog in-router or documented one-hop ==="
FAILURES=0
while IFS= read -r router_file; do
  [[ -z "$router_file" ]] && continue
  if ! file_has_pattern "$router_file" '\.mutation\('; then
    continue
  fi
  if file_has_pattern "$router_file" 'writeAuditLog'; then
    continue
  fi
  if is_one_hop_allowed "$router_file"; then
    echo "OK (one-hop allowlist): $router_file"
    continue
  fi
  echo "FAIL: $router_file has .mutation( but no writeAuditLog and is not in ONE_HOP_ALLOWLIST" >&2
  FAILURES=$((FAILURES + 1))
done < <(list_router_files)

# Core-spine routers must exist and remain mutation+audit instrumented
CORE_SPINE_ROUTERS=(
  "src/server/trpc/routers/incident.ts"
  "src/server/trpc/routers/capa.ts"
  "src/server/trpc/routers/approval.ts"
  "src/server/trpc/routers/contextSyncProtocol.ts"
  "src/server/trpc/routers/organization.ts"
  "src/server/trpc/routers/dataRetentionRouter.ts"
)
echo ""
echo "=== Gate: Core-spine must-audit routers present ==="
for core in "${CORE_SPINE_ROUTERS[@]}"; do
  if [[ ! -f "$core" ]]; then
    echo "FAIL: missing Core-spine router $core" >&2
    FAILURES=$((FAILURES + 1))
    continue
  fi
  if ! file_has_pattern "$core" '\.mutation\(' && [[ "$core" != *auditTrail* ]]; then
    # dataRetention / organization / etc. must keep mutations; skip only if truly query-only
    if ! file_has_pattern "$core" 'writeAuditLog'; then
      echo "FAIL: Core-spine router $core lacks writeAuditLog" >&2
      FAILURES=$((FAILURES + 1))
    fi
  elif ! file_has_pattern "$core" 'writeAuditLog'; then
    if ! is_one_hop_allowed "$core"; then
      echo "FAIL: Core-spine router $core lacks writeAuditLog / one-hop" >&2
      FAILURES=$((FAILURES + 1))
    fi
  else
    echo "OK: $core"
  fi
done

echo ""
if [[ "$FAILURES" -gt 0 ]]; then
  echo "audit-matrix-greps: FAILED ($FAILURES issue(s)). Add writeAuditLog in-router, or document a one-hop callee in ONE_HOP_ALLOWLIST + docs/qa/mutation-auditability-matrix.md." >&2
  exit 1
fi

echo "audit-matrix-greps: OK — mutation routers audited (in-router or one-hop). Update docs/qa/mutation-auditability-matrix.md if inventory changes materially."
exit 0
