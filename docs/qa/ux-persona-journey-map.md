# UX persona journey map (ADR-UX-001 / AC-001 adjacency, AC-002 evidence seed)

**Date:** 2026-07-19  
**Nav authority:** Today / Capture / Decide / Prove primary modes.

## Personas

| Persona | Primary modes | Secondary use |
|---------|---------------|---------------|
| Field | Today (pending) + Capture | Prove = “what I submitted”; Administration hidden unless permitted |
| Desk contributor | Today + Capture | Light Decide if approver; Prove for evidence packs |
| Desk supervisor | Today + Decide + Prove | Capture secondary |

## Journeys J1–J4

| ID | Persona | Route path | Permissions (typical) | Success criteria |
|----|---------|------------|----------------------|------------------|
| **J1** | Field | Today or Capture → `/dashboard/incidents` (create) → outbox sync status | `incident:create` (or equivalent); Field outbox when flag on | Draft/submit succeeds; sync failure visible in Today/Capture chrome without Integrations admin |
| **J2** | Desk supervisor | Today → Decide `/dashboard/approvals` → Prove `/dashboard/audit-trail` | Approver permission for step family; `audit_trail:read` | Approval decide completes; audit-trail row visible for mutation |
| **J3** | Desk / field | Capture `/dashboard/inspections` → Decide `/dashboard/capa` (linkage) | Inspection complete + CAPA create | CAPA reachable under Decide without Administration |
| **J4** | Desk | Decide (encoded reopen/escalate on Core entity) | Transition permission + justification fields | Uses server-encoded transitions; no client-side status authority |

## Field Administration hide

Executable: `tests/unit/dashboard/cohesion.test.ts` — field layout without admin/integration/audit-trail hides **Administration**.

## Capture + Decide without Administration

| Journey | Mode | Admin required? |
|---------|------|-----------------|
| Incident create | Capture | No |
| Approvals decide | Decide | No |

## Outbox failure visibility

When `NEXT_PUBLIC_FIELD_OUTBOX=1`, failed sync surfaces in field chrome (Today/Capture), not only under Administration → Integrations.
