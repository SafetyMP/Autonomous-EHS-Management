# IA task-mode map (ADR-UX-001 / AC-001)

**Authority:** `src/lib/dashboard-nav-links.ts` (`DASHBOARD_NAV_SECTIONS`)  
**Date:** 2026-07-19

Every Core nav href maps to **exactly one** primary mode. Connected/Plumbing use secondary clusters only.

## Primary modes

| Mode | Intent | Href | Label | Tier (unchanged) |
|------|--------|------|-------|------------------|
| Today | Personal queue / next actions | `/dashboard` | Command center | Core |
| Today | Tasks & reviews | `/dashboard/tasks` | Tasks & reviews | Core |
| Capture | Incident intake | `/dashboard/incidents` | Incidents | Core |
| Capture | Observation intake | `/dashboard/observations` | Observations | Connected |
| Capture | Inspection intake | `/dashboard/inspections` | Inspections | Core |
| Capture | PTW create adjacency | `/dashboard/permits` | Work permits (PTW) | Connected |
| Decide | Approvals inbox | `/dashboard/approvals` | Approvals | Core |
| Decide | CAPA plan/verify | `/dashboard/capa` | CAPA register | Core |
| Prove | System audit trail | `/dashboard/audit-trail` | Audit trail | Core |
| Prove | Evidence register adjacency | `/dashboard/documents` | Documents | Core |

**Not in Prove:** `/dashboard/analytics`, `/dashboard/analytics/incidence-rates` (secondary Records & metrics).

## Secondary clusters (Connected / Plumbing — not peer Core)

| Cluster | Hrefs |
|---------|-------|
| Plan & programme | `/dashboard/planning`, `/dashboard/heat-program`, `/dashboard/risk-assessments`, `/dashboard/environment`, `/dashboard/chemicals`, `/dashboard/environmental-permits` |
| Assure & improve | `/dashboard/audits`, `/dashboard/assurance`, `/dashboard/management-review` |
| Records & metrics | `/dashboard/rag`, `/dashboard/retention`, `/dashboard/analytics`, `/dashboard/analytics/incidence-rates` |
| People | `/dashboard/training`, `/dashboard/contractors` |
| Administration | `/dashboard/program`, `/dashboard/emergency`, `/dashboard/moc`, `/dashboard/import`, `/dashboard/integrations`, `/dashboard/privacy-requests`, `/dashboard/context`, `/dashboard/workflow-catalog` |

## Shell exposure

| Shell | Four modes | Notes |
|-------|------------|-------|
| Desk | All four primary + secondary clusters | Secondary collapsed unless path match |
| Field | All four primary; Administration hidden without admin/integration/audit-trail | Same filter as pre-ADR |

## UAT journeys without Administration

| Journey | Mode path | Pass criteria |
|---------|-----------|---------------|
| Capture | Capture → Incidents (create/submit) | Completes without opening Administration |
| Decide | Decide → Approvals (approve/reject) | Completes without opening Administration |

## Maturity

IA regroup alone does **not** change `docs/module-maturity.md` tiers or Banner flags. Verified by `node scripts/module-maturity-check.mjs`.
