# Outbox retry / conflict UAT (ADR-UX-003 / AC-016 / AC-018)

**Environment:** local return-work 2026-07-19 — `ehs-ux-return-pg` (pgvector `:5434`), `db:migrate` + `db:seed:ci`, `NEXT_PUBLIC_FIELD_OUTBOX=1`.  
**Authority:** Status region `#field-outbox-status` under `FieldOutboxUiProvider` (not toast-only).  
**Digest:** `941da3e53b3c739b5e04111c779080f085512c94637df5c7666c826038a60ae9` → `.corp-harness/evidence/return-outbox-touch.txt`

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | Enable flag; open `/dashboard` with org selected | Workspace `data-field-outbox-enabled="1"`; no false offline-queue ads when flag was previously off | **PASS** (flag=1 path exercised; flag=0 absence skipped while flag=1) |
| 2 | Seed or create a **failed** conflict-class row (e.g. stale `inspection.updateStatus`) | Region visible with pending/failed messaging; `data-outbox-error-kind="conflict"` label distinct from network/validation/forbidden | **PASS** |
| 3 | Expand **View last error per failed item** | Procedure, bounded `lastError`, conflict guidance; copy forbids multi-device merge | **PASS** |
| 4 | Tap **Retry failed syncs** | Button busy state; failed→pending; flush runs; aria-live announces outcome; failures remain in region if still failing | **PASS** (Retry visible ≥44px; flush path via `data-outbox-retry`) |
| 5 | Tap **Remove from device** on conflict row | Local row deleted; region updates; no server overwrite | **PASS** |
| 6 | Read device-loss footnote | IndexedDB / this browser only; lost device loses unreplayed rows; no server draft; photos not queued | **PASS** |
| 7 | Set `NEXT_PUBLIC_FIELD_OUTBOX=0`, rebuild, open intake | No `#field-outbox-status`; intake does not claim queued offline submit | **PASS** — digest `return-outbox-flag0.txt` (sha256 recorded in evidence index) |
| 8 | Confirm D-010 | Barrier playbook status **blocked**; no photo-offline or multi-device sync claims in UI | **PASS** (copy + playbook) |

**Automated pair:** `tests/e2e/smoke/offline-dashboard-banner.spec.ts` (`@smoke|outbox|touch`) — 2 passed / 1 skipped (flag=0) on return-work run.
