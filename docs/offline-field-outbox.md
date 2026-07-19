# Offline field outbox (IndexedDB)

## Purpose

Queue **high-friction field mutations** when the browser is offline, then **replay** them through the **same tRPC mutations** (and therefore the **same RBAC checks**) when connectivity returns. No shadow database and no bypass of `assertPermission` on the server.

## Enablement

Set in environment (see [`.env.example`](../.env.example)):

```bash
NEXT_PUBLIC_FIELD_OUTBOX=1
```

If unset or `0`, forms require an online connection for submit (existing UX).

## Implementation

- **Queue:** [`src/lib/offline/fieldOutbox.ts`](../src/lib/offline/fieldOutbox.ts) — IndexedDB store `ehs_field_outbox_v1`, procedure names as `FieldOutboxProcedure`. Helpers **`listFailedFieldOutbox`**, **`resetFailedFieldOutboxToPending`**, **`resetAllFailedFieldOutboxForOrg`**, and **`removeFieldOutbox`** manage failed-row lifecycle.
- **Global replay:** [`src/components/field-outbox-global-sync.tsx`](../src/components/field-outbox-global-sync.tsx) runs inside the dashboard **`OrgProvider`** ([`src/components/dashboard-shell.tsx`](../src/components/dashboard-shell.tsx)) when the client is **online** and the flag is on. It dispatches each row to the matching mutation with **`idempotencyKey: row.localId`** (UUID) so duplicate replays are safe where idempotency is implemented ([`src/server/services/mutationIdempotency.ts`](../src/server/services/mutationIdempotency.ts)). A **`flushNonce`** from [`src/components/field-outbox-ui-bridge.tsx`](../src/components/field-outbox-ui-bridge.tsx) lets the UI force another pass after **Retry failed syncs**.

## Failed rows and retry

If a replay throws (validation, network, etc.), the row is marked **`failed`** with a bounded **`lastError`** (see `markFieldOutboxFailed`). While **`NEXT_PUBLIC_FIELD_OUTBOX=1`**, the dashboard shows a compact **status bar** ([`FieldOutboxStatusBar`](../src/components/field-outbox-ui-bridge.tsx)): last flush **sent** / **failed** counts, a control to **reset all failed rows to pending**, and per-row **Remove from device** (calls **`removeFieldOutbox`**) when the server copy changed and the operator should abandon the stale queue item. Bump the flush nonce so [`FieldOutboxGlobalSync`](../src/components/field-outbox-global-sync.tsx) runs again after bulk retry. Operators should fix the underlying issue (connectivity, payload) before retrying.

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

## Ops checklist (R-011)

Use this when enabling or supporting field outbox in staging/pilot. Photos offline and multi-device reconciliation remain **non-goals** until barrier **D-010** is resolved ([`docs/barrier-resolution-playbook.md`](barrier-resolution-playbook.md)).

### 1. Enablement

- [ ] Confirm tenant/org policy allows offline queueing for the pilot cohort.
- [ ] Set `NEXT_PUBLIC_FIELD_OUTBOX=1` only on environments that share that policy (staging first).
- [ ] Smoke: create one supported procedure online, one offline → reconnect → confirm server row + RBAC still enforced.
- [ ] Document which procedures are in scope for the cohort (table above); do not claim photo or multi-device sync.

### 2. Failed-sync triage

- [ ] Open the dashboard **Field outbox** status bar; note **sent** / **failed** counts after flush.
- [ ] Read `lastError` on failed rows (validation vs network vs permission).
- [ ] Fix root cause (payload, connectivity, role grants), then **Retry failed syncs** (reset failed → pending + flush).
- [ ] If the server copy already changed and the queued payload is stale, **Remove from device** for that row (do not force-overwrite regulated records blindly).
- [ ] Escalate persistent failures with org id, procedure name, and truncated error — never paste full bearer/session secrets.

### 3. Device-loss acknowledgment

- [ ] Acknowledge with the user: queued items live in **that browser’s IndexedDB** until successful replay.
- [ ] Lost/wiped/replaced devices **lose unreplayed outbox rows** — there is no server-side draft authority for pending queue items.
- [ ] Instruct re-entry of critical field data after device loss; do not promise cross-device recovery.
- [ ] Record the acknowledgment in the support ticket / pilot log when regulated evidence was at risk.

## Limitations

- **Per-browser queue:** data is not synced across devices until replay succeeds on the device that queued it.
- **No server-side draft authority:** queued payloads are client JSON until a successful mutation; retention and legal hold apply to **persisted** rows only.
- **Conflicts:** last replay wins per entity; concurrent edits elsewhere are not merged automatically.
- **Photos:** field photos are **not** queued offline today — remove photos or reconnect before save (see user manual).

## Roadmap alignment

Deeper “substantive offline” UX (draft recovery, conflict surfacing, photo/multi-device policy) remains in [`ROADMAP.md`](../ROADMAP.md) / D-010; this document describes the **durable outbox + RBAC-preserving replay** contract plus the ops checklist above.
