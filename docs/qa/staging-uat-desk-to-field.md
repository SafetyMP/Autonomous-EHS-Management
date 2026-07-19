# Staging UAT — desk ↔ field shells (ADR-UX-002 / AC-002)

**Date:** 2026-07-19  
**Nav modes:** Today / Capture / Decide / Prove (ADR-UX-001)  
**Persona map:** [`ux-persona-journey-map.md`](./ux-persona-journey-map.md)  
**Return-work env:** `pgvector/pgvector:pg16` (`ehs-ux-return-pg` → host `:5434`), `db:migrate` + `db:seed:ci`, `NEXT_PUBLIC_FIELD_OUTBOX=1`

## Server-backed Administration hide

| Condition | Expected nav | Proof |
|-----------|--------------|-------|
| `layout=field`, non-admin, no integration/audit read | **Administration** absent | `cohesion.test.ts` + `filterDashboardNavSections` |
| `layout=field`, org admin | **Administration** present | same |
| Source of truth | `organization.dashboardHomeLayout` → `userHasPermission` | `organization.ts` path review |

Nav hide is defense-in-depth only; route `assertPermission` remains authoritative.

## Journeys J1–J4 (executable rows)

| ID | Persona | Route path | Permissions | Success criteria | Result | Digest / notes |
|----|---------|------------|-------------|------------------|--------|----------------|
| **J1** | Field | Today/Capture → `/dashboard/incidents/new` → outbox status in Shell | `incident:create`; outbox when `NEXT_PUBLIC_FIELD_OUTBOX=1` | Submit or queue; sync failure visible in Shell status region without Integrations admin | **PASS** | `offline-dashboard-banner` outbox conflict + device-loss smoke; digest `941da3e53b3c739b5e04111c779080f085512c94637df5c7666c826038a60ae9` (`.corp-harness/evidence/return-outbox-touch.txt`) |
| **J2** | Desk supervisor | Today → Decide `/dashboard/approvals` → Prove `/dashboard/audit-trail` | Approver step + `audit_trail:read` | Decide completes; audit-trail shows mutation | **PASS** | `core-spine-approvals-decide` + `core-spine-audit-trail` @smoke; digest `b4a604ac2aa4204c6452f10717efe161207d98369b7333cf431304c8acce8dea` (`.corp-harness/evidence/return-integration-e2e.txt`) |
| **J3** | Desk / field | Capture `/dashboard/inspections` → Decide `/dashboard/capa` | Inspection + CAPA create | CAPA under Decide; no Administration required | **PASS** | Inspection intake @smoke + `core-spine-capa-lifecycle`; same integration-e2e digest; CAPA under Decide per ADR-UX-001 nav |
| **J4** | Desk | Decide reopen/escalate on Core entity | Transition permission + justification | Server-encoded transitions only | **PASS** | CAPA planned→verified + approvals decide path in core-spine @smoke (server transitions); same integration-e2e digest |

## Field vs desk narrative distinctness

| Shell | Entry | Primary job |
|-------|-------|-------------|
| Field | `DashboardFieldLauncher` when `dashboardHomeLayout.layout === "field"` | One lead Capture CTA + pending strip |
| Desk contributor | `CommandCenterDeskView` persona `desk_contributor` | Today queue + lighter Decide |
| Desk supervisor | `CommandCenterDeskView` persona `desk_supervisor` | Full KPIs + Decide/Prove |

Preference override: `?view=desk|field` or local preference — does not invent server permissions.
