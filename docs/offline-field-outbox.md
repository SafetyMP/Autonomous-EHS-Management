# Offline field outbox (IndexedDB)

## Purpose

Queue **high-friction field mutations** when the browser is offline, then **replay** them through the **same tRPC mutations** (and therefore the **same RBAC checks**) when connectivity returns. No shadow database and no bypass of `assertPermission` on the server.

## Enablement

Set in environment (see [`.env.example`](../.env.example)):

```bash
NEXT_PUBLIC_FIELD_OUTBOX=1
```

If unset or `0`, forms require an online connection for submit (existing UX). **Do not advertise offline queue** when the flag is off.

## Status-region-first UX (ADR-UX-003)

- **Authority:** Durable chrome status region [`FieldOutboxStatusBar`](../src/components/field-outbox-ui-bridge.tsx) (`#field-outbox-status`, landmark **Offline sync queue**) under [`FieldOutboxUiProvider`](../src/components/field-outbox-ui-bridge.tsx) in [`DashboardShell`](../src/components/dashboard-shell.tsx).
- **Optional success toast:** [`FieldOutboxSuccessToast`](../src/components/field-outbox-ui-bridge.tsx) may confirm short **success** only. Failed sync, conflict, and device-loss **must not** be toast-only.
- **AT:** Flush outcomes use `role="status"` / `aria-live="polite"` on the status region (and success toast when shown).

## Implementation

- **Queue:** [`src/lib/offline/fieldOutbox.ts`](../src/lib/offline/fieldOutbox.ts) — IndexedDB `ehs_field_outbox_v1` (`FIELD_OUTBOX_DB_NAME`), procedure names as `FieldOutboxProcedure`. Helpers **`listFailedFieldOutbox`**, **`resetFailedFieldOutboxToPending`**, **`resetAllFailedFieldOutboxForOrg`**, and **`removeFieldOutbox`** manage failed-row lifecycle. Failures store bounded **`lastError`** + **`errorKind`** via [`outboxErrorKind.ts`](../src/lib/offline/outboxErrorKind.ts).
- **Global replay:** [`src/components/field-outbox-global-sync.tsx`](../src/components/field-outbox-global-sync.tsx) runs inside the dashboard **`OrgProvider`** when the client is **online** and the flag is on. It dispatches each row to the matching mutation with **`idempotencyKey: row.localId`**. A **`flushNonce`** lets the UI force another pass after **Retry failed syncs**.

## Failed rows and retry

While **`NEXT_PUBLIC_FIELD_OUTBOX=1`**, the status region shows pending / last-flush / failed lines, conflict-specific labels and guidance, **Retry failed syncs**, and per-row **Remove from device**. Footnotes state IndexedDB device-loss risk and that **photos are not queued offline**. Operators should fix the underlying issue (connectivity, payload, permission) before retrying. Conflict path: abandon stale local row and re-enter from the live form — **not** multi-device merge (**D-010** blocked).

## Supported procedures

| Procedure | Mutation | Enqueued from |
|-----------|----------|----------------|
| `incident.create` | `incident.create` | New incident |
| `observation.create` | `observation.create` | New observation |
| `inspection.create` | `inspection.create` | New inspection |
| `inspection.updateStatus` | `inspection.updateStatus` | Inspection detail |
| `permit.create` | `permit.create` | New permit |
| `permit.submitForApproval` | `permit.submitForApproval` | Permit detail |
| `environmentalRegulatoryPermit.create` | `environmentalRegulatoryPermit.create` | New environmental permit |
| `environmentalRegulatoryPermit.submitForApproval` | `environmentalRegulatoryPermit.submitForApproval` | Environmental permit detail |
| `planning.risk.create` | `planning.risk.create` | New risk assessment (roster) or Planning |

## Ops checklist (R-011 / AC-018)

Use this when enabling or supporting field outbox in staging/pilot. Photos offline and multi-device reconciliation remain **non-goals** until barrier **D-010** is resolved ([`docs/barrier-resolution-playbook.md`](barrier-resolution-playbook.md)).

### 1. Enablement

- [ ] Confirm tenant/org policy allows offline queueing for the pilot cohort.
- [ ] Set `NEXT_PUBLIC_FIELD_OUTBOX=1` only on environments that share that policy (staging first).
- [ ] Smoke: create one supported procedure online, one offline → reconnect → confirm server row + RBAC still enforced.
- [ ] Document which procedures are in scope for the cohort (table above); do not claim photo or multi-device sync.
- [ ] With flag off, confirm intake does not claim queued offline submit.

### 2. Failed-sync triage

- [ ] Open dashboard **Offline sync queue** status region (`#field-outbox-status`); note **sent** / **failed** counts after flush.
- [ ] Read `lastError` / `errorKind` on failed rows (validation vs network vs conflict vs permission).
- [ ] Fix root cause, then **Retry failed syncs** (reset failed → pending + flush).
- [ ] If the server copy already changed and the queued payload is stale, **Remove from device** for that row.
- [ ] Escalate persistent failures with org id, procedure name, and truncated error — never paste full bearer/session secrets.
- [ ] Confirm failures remain visible in the status region (not toast-only).

### 3. Device-loss acknowledgment

- [ ] Acknowledge with the user: queued items live in **that browser’s IndexedDB** until successful replay (status footnote + this checklist).
- [ ] Lost/wiped/replaced devices **lose unreplayed outbox rows** — there is no server-side draft authority for pending queue items.
- [ ] Instruct re-entry of critical field data after device loss; do not promise cross-device recovery.
- [ ] Record the acknowledgment in the support ticket / pilot log when regulated evidence was at risk.

## Limitations

- **Per-browser queue:** data is not synced across devices until replay succeeds on the device that queued it.
- **No server-side draft authority:** queued payloads are client JSON until a successful mutation; retention and legal hold apply to **persisted** rows only.
- **Conflicts:** last replay wins per entity; concurrent edits elsewhere are not merged automatically (D-010).
- **Photos:** field photos are **not** queued offline today — remove photos or reconnect before save (see user manual).
- **Installable web only:** PWA shortcut language is progressive web — not a native store app (**D-006** blocked).

## Roadmap alignment

Deeper “substantive offline” UX (draft recovery, photo/multi-device policy) remains in [`ROADMAP.md`](../ROADMAP.md) / D-010; this document describes the **durable outbox + RBAC-preserving replay** contract, status-region-first chrome (ADR-UX-003), and the ops checklist above.
