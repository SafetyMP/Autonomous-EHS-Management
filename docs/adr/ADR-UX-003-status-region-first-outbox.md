# ADR-UX-003: Status-region-first field sync UX; PWA/outbox honesty (D-006 / D-010 blocked)

**Status:** Accepted (site packet PKT-UX-003)  
**Date:** 2026-07-19  
**Program:** `ehs` / corporate UX handoff revision 1  
**Requirements:** R-014, R-015, R-016, R-017 (platform R-PL-001..R-PL-006)  
**Acceptance:** AC-015, AC-016, AC-017, AC-018, AC-009, AC-023  
**Depends on:** ADR-UX-001 (task-first IA), ADR-UX-002 (sole shell + tokens)  
**Closes:** UD-PL-UX-002 (toast host vs status-region-first)

## Context

Corporate acceptance left **UD-PL-UX-002** open: whether a mandatory centralized toast host or a **status-region-first** contract owns failed sync / conflict / device-loss messaging. Field outbox already mounts `FieldOutboxStatusBar` under `FieldOutboxUiProvider` in `DashboardShell`. Barriers **D-006** (native mobile) and **D-010** (multi-device / photo offline) remain **blocked** for claim expansion.

## Decision

### 1. Status-region-first (closes UD-PL-UX-002) — AC-015 / R-PL-001 / R-PL-005

- The durable live status region in dashboard chrome — `FieldOutboxStatusBar` (landmark `#field-outbox-status`, `role="region"` aria-label **Offline sync queue**) under `FieldOutboxUiProvider` — is the **authority** for pending/failed outbox counts, conflict triage, flush outcomes, and device-loss honesty when `NEXT_PUBLIC_FIELD_OUTBOX=1`.
- An **optional** success toast host (`FieldOutboxSuccessToast`) is **additive** for short success confirmations only (`role="status"` + `aria-live="polite"`). It **MUST NOT** be the sole channel for failed sync, conflict, or device-loss risk.
- With flag unset/`0`, outbox status chrome is absent and intake must not advertise queued offline submit.

### 2. Retry, conflict abandon, last-replay-wins — AC-016 / R-PL-002

- Primary control **Retry failed syncs** resets failed→pending and bumps flush.
- Conflict-class rows (`errorKind=conflict`) show a distinct label and operator hint; **Remove from device** abandons the stale local row.
- Microcopy forbids multi-device merge / “synced across devices” / photo-offline claims while **D-010** is blocked. Technical rule remains last-replay-wins until policy exists.

### 3. PWA safe-area and ≥44px — AC-017 / AC-009 / R-PL-003 / R-PL-004

- Sticky header and outbox status clear `env(safe-area-inset-*)`; root `viewportFit: cover` is not regressed.
- Field primaries and outbox **Retry** / **Remove** use `.touch-target` / ≥44×44 CSS px.
- Install hint + manifest use **installable progressive web** language only — not App Store / native mobile (**D-006** blocked).

### 4. Device-loss and ops checklist UX — AC-018 / R-PL-006

- Status footnotes state: queue lives in **this browser’s IndexedDB**; lost/wiped/replaced devices lose unreplayed rows; **no server-side draft authority**; photos are **not** queued offline when the flag is on.
- Ops checklist in `docs/offline-field-outbox.md` remains the support source; this ADR surfaces those hooks in chrome, not new queue APM.

### 5. Unresolved decisions logged — AC-023

| ID | Status | Implication |
|----|--------|-------------|
| **D-006** | blocked | Responsive / installable web only |
| **D-010** | blocked | Abandon/retry conflict UX; no photo offline / multi-device merge |
| **UD-PL-UX-002** | **closed** by this ADR | Status-region-first; optional success toast only |
| **UD-PL-UX-001** | open | Draft-recovery form rehydration remains P3 / later |

## Consequences

- Failed outbox paths must remain visible in `#field-outbox-status` even if a success toast is dismissed or never shown.
- Claim-lint + barrier playbook keep D-006/D-010 blocked; no native-store or offline-photo marketing.

## Evidence

| Artifact | Path |
|----------|------|
| Outbox retry/conflict UAT | [`docs/qa/outbox-retry-conflict-uat.md`](../qa/outbox-retry-conflict-uat.md) |
| PWA safe-area / touch targets | [`docs/qa/pwa-safe-area-touch-targets.md`](../qa/pwa-safe-area-touch-targets.md) |
| Ops checklist | [`docs/offline-field-outbox.md`](../offline-field-outbox.md) |
| Smoke | `tests/e2e/smoke/offline-dashboard-banner.spec.ts` |
| Verify digest | [`.corp-harness/evidence/adr-ux-003-verify.txt`](../../.corp-harness/evidence/adr-ux-003-verify.txt) |
