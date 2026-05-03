# Approval workflow (CAPA plan gate, work permits & environmental permits)

This document records **serial approval chains** for regulated workflow: **CAPA** plan gate, **permits to work**, and **environmental regulatory permit** activation share `approval_request` / `approval_step`.

## Data model

- [`approval_request`](../src/server/db/schema.ts) — `entityType` (`capa` \| `incident` \| **`work_permit`** \| **`environmental_regulatory_permit`**), `entityId`, `status` (`open` \| `approved` \| `rejected` \| `cancelled`).
- [`approval_step`](../src/server/db/schema.ts) — serial steps; each row has `approverUserId`, `status`, optional `comment`, `decidedAt`, optional **`dueAt`** (SLA). Multi-step chains use staggered due dates from submit time.

## Server rules

1. **CAPA submit:** [`approval.submitCapaPlanApproval`](../src/server/trpc/routers/approval.ts) (`approverUserId` or `approvers[]`, optional `slaDaysPerStep`) or inline creation during [`capa.create`](../src/server/trpc/routers/capa.ts) with `initialStatus: "pending_approval"` and `approverUserIdForPlan` / **`approverUserIdsForPlan`** / **`slaDaysPerPlanApproval`**.
2. **Work permit submit:** [`permit.submitForApproval`](../src/server/trpc/routers/permit.ts) transitions `draft` → `pending_approval` and inserts the approval chain; optional [`approval.submitWorkPermitApproval`](../src/server/trpc/routers/approval.ts) for the chain only when the permit is already `pending_approval`.
3. **Environmental regulatory permit submit:** [`environmentalRegulatoryPermit.submitForApproval`](../src/server/trpc/routers/environmentalRegulatoryPermit.ts) transitions `draft` → `pending_approval` for register **activation** (optional program control). Rejection returns the permit to **`draft`** (no separate `rejected` status on that enum). [`environmentalRegulatoryPermit.withdrawSubmission`](../src/server/trpc/routers/environmentalRegulatoryPermit.ts) cancels an open request and returns **`draft`**.
4. **Decide:** [`approval.decideRequest`](../src/server/trpc/routers/approval.ts) — only the pending step’s `approverUserId` may approve/reject; permission is **`capa:approve`** for CAPA (and incident rows, if used), **`work_permit:approve`** for permits to work, and **`environmental_permit:approve`** for environmental regulatory permits; writes [`audit_log`](../src/server/services/audit.ts). Final approval on a work permit sets it **`active`** with `approvedByUserId` / `approvedAt`; rejection sets **`rejected`**. Final approval on an environmental regulatory permit sets **`active`**.
5. **CAPA enforcement:** [`capa.updateStatus`](../src/server/trpc/routers/capa.ts) blocks `pending_approval` → `planned` unless an **`approved`** request exists for that CAPA.
6. **Overdue steps:** Cron (see [`/api/cron/reminders`](../src/app/api/cron/reminders/route.ts)) records **`escalation_event`** rows for pending steps past `dueAt` (visibility only; no notifications in MVP).

## Permissions

- **`capa:approve`** — inbox + decide for CAPA-related steps ([`listMyPendingSteps`](../src/server/trpc/routers/approval.ts)).
- **`work_permit:approve`** — decide steps for `entity_type = work_permit`.
- **`environmental_permit:approve`** — inbox + decide steps for `entity_type = environmental_regulatory_permit`.
- **`capa:read`** — view recorded overdue escalations ([`listEscalations`](../src/server/trpc/routers/approval.ts)); surfaced on **Approvals** when present.
- Seeds grant **all** `PERMISSIONS` to the demo admin role, including approve keys.

## UX

- **Approvals** nav: [`/dashboard/approvals`](../src/app/dashboard/approvals/page.tsx) (CAPA, permit, and environmental regulatory permit rows when the user has the matching approve permission).
- **CAPA** page: plan approval field set on create; rows without an open request can assign an approver and submit.
- **Permits to work:** [`/dashboard/permits`](../src/app/dashboard/permits/page.tsx) draft → submit approvers; pending approvers act from Approvals or inline on the permit detail when they are the pending step.
- **Environmental permits:** [`/dashboard/environmental-permits`](../src/app/dashboard/environmental-permits/page.tsx) draft → optional activation approval (`draft` → `pending_approval` → `active`), with withdraw while pending.

## Future extensions

- Parallel approvers, role-based routing, explicit incident approval flows, and cancelling in-flight steps without mutating parent entity state should **reuse** `approval_request` / `approval_step` rather than duplicating tables per entity.
