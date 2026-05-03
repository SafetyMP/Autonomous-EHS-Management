# Approval workflow (CAPA plan gate)

This document records the **context-guardian** design for the first approval-chain slice: **CAPA** transitions from `pending_approval` to `planned` require a completed **approval request**.

## Data model

- [`approval_request`](../src/server/db/schema.ts) — `entityType` (`capa` \| `incident`), `entityId`, `status` (`open` \| `approved` \| `rejected` \| `cancelled`).
- [`approval_step`](../src/server/db/schema.ts) — serial steps; each row has `approverUserId`, `status`, optional `comment`, `decidedAt`, optional **`dueAt`** (SLA). Multi-step chains use staggered due dates from submit time.

## Server rules

1. **Submit:** [`approval.submitCapaPlanApproval`](../src/server/trpc/routers/approval.ts) (`approverUserId` or `approvers[]`, optional `slaDaysPerStep`) or inline creation during [`capa.create`](../src/server/trpc/routers/capa.ts) with `initialStatus: "pending_approval"` and `approverUserIdForPlan` / **`approverUserIdsForPlan`** / **`slaDaysPerPlanApproval`**.
2. **Decide:** [`approval.decideRequest`](../src/server/trpc/routers/approval.ts) — only the pending step’s `approverUserId` may approve/reject; writes [`audit_log`](../src/server/services/audit.ts).
3. **Enforcement:** [`capa.updateStatus`](../src/server/trpc/routers/capa.ts) blocks `pending_approval` → `planned` unless an **`approved`** request exists for that CAPA.
4. **Overdue steps:** Cron (see [`/api/cron/reminders`](../src/app/api/cron/reminders/route.ts)) records **`escalation_event`** rows for pending steps past `dueAt` (visibility only; no notifications in MVP).

## Permissions

- **`capa:approve`** — inbox + decide ([`listMyPendingSteps`](../src/server/trpc/routers/approval.ts)).
- **`capa:read`** — view recorded overdue escalations ([`listEscalations`](../src/server/trpc/routers/approval.ts)); surfaced on **Approvals** when present.
- Seeds grant **all** `PERMISSIONS` to the demo admin role, including `capa:approve`.

## UX

- **Approvals** nav: [`/dashboard/approvals`](../src/app/dashboard/approvals/page.tsx).
- **CAPA** page: plan approval field set on create; rows without an open request can assign an approver and submit.

## Future extensions

- Parallel approvers, role-based routing, incidents, and cancellation flows should **reuse** `approval_request` / `approval_step` rather than duplicating tables per entity.
