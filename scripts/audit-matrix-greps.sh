#!/usr/bin/env bash
# Matches methodology in docs/qa/mutation-auditability-matrix.md.
# Prefers ripgrep (`rg`); falls back to find(1)+grep(1) when rg is missing.
set -euo pipefail
cd "$(dirname "$0")/.."

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
echo "Done. Update docs/qa/mutation-auditability-matrix.md if router inventory changes materially."
