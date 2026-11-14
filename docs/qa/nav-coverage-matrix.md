# Navigation coverage matrix — corporate redesign

**Revision:** 2026-11-14, [ADR-UX-008](../adr/ADR-UX-008-corporate-navigation.md).
**Source:** `DASHBOARD_NAV_SECTIONS` in `src/lib/dashboard-nav-links.ts`.
**Rule:** All 33 existing destination URLs appear exactly once. Six named work areas precede separate Administration. The current work area opens automatically; navigation search expands matching destinations.

This current matrix supersedes the old Today / Capture / Decide / Prove placement. Historical ADRs, approvals, and evidence remain unchanged. `cluster: "primary"` now denotes a corporate work area, not a maturity tier: placing Chemical inventory within Programs & risks does not promote it from Plumbing or remove its maturity notice. [Module maturity](../module-maturity.md) remains the authority for capability scope.

| # | Work area | Cluster | Href | Placement notes |
|---|-----------|---------|------|-----------------|
| 1 | Overview | primary | `/dashboard` | Corporate overview or field home, according to layout |
| 2 | Actions & approvals | primary | `/dashboard/tasks` | Assigned work and reviews |
| 3 | Actions & approvals | primary | `/dashboard/capa` | Corrective actions; existing lifecycle |
| 4 | Actions & approvals | primary | `/dashboard/approvals` | Existing human approval gates |
| 5 | Incidents & observations | primary | `/dashboard/incidents` | Incident register and detail links |
| 6 | Incidents & observations | primary | `/dashboard/observations` | Observation intake and follow-up |
| 7 | Audits & inspections | primary | `/dashboard/audits` | Internal audit program, not system audit history |
| 8 | Audits & inspections | primary | `/dashboard/inspections` | Inspection register |
| 9 | Audits & inspections | primary | `/dashboard/assurance` | Assurance hub |
| 10 | Audits & inspections | primary | `/dashboard/management-review` | Management review |
| 11 | Programs & risks | primary | `/dashboard/program` | Existing field visibility restriction retained |
| 12 | Programs & risks | primary | `/dashboard/planning` | Planning registers |
| 13 | Programs & risks | primary | `/dashboard/risk-assessments` | Existing maturity notice retained |
| 14 | Programs & risks | primary | `/dashboard/permits` | Work permits (PTW), separate from environmental permits |
| 15 | Programs & risks | primary | `/dashboard/environment` | Environmental program |
| 16 | Programs & risks | primary | `/dashboard/environmental-permits` | Environmental permit register, not work authorization |
| 17 | Programs & risks | primary | `/dashboard/chemicals` | Plumbing; existing maturity notice retained |
| 18 | Programs & risks | primary | `/dashboard/heat-program` | Program aid; existing maturity notice retained |
| 19 | Programs & risks | primary | `/dashboard/training` | Training records |
| 20 | Programs & risks | primary | `/dashboard/contractors` | Contractor register |
| 21 | Programs & risks | primary | `/dashboard/emergency` | Existing field visibility restriction retained |
| 22 | Programs & risks | primary | `/dashboard/moc` | Existing field visibility restriction retained |
| 23 | Reports & evidence | primary | `/dashboard/analytics` | Metrics |
| 24 | Reports & evidence | primary | `/dashboard/analytics/incidence-rates` | Most-specific active route; does not also mark Metrics active |
| 25 | Reports & evidence | primary | `/dashboard/documents` | Document register |
| 26 | Reports & evidence | primary | `/dashboard/audit-trail` | System audit history, not internal audits |
| 27 | Reports & evidence | primary | `/dashboard/rag` | Knowledge library; existing permissions |
| 28 | Reports & evidence | primary | `/dashboard/retention` | Retention; existing field visibility preserved |
| 29 | Administration | secondary | `/dashboard/import` | Plumbing; existing maturity notice retained |
| 30 | Administration | secondary | `/dashboard/integrations` | Integration administration |
| 31 | Administration | secondary | `/dashboard/privacy-requests` | Plumbing; existing maturity notice retained |
| 32 | Administration | secondary | `/dashboard/context` | Organization context |
| 33 | Administration | secondary | `/dashboard/workflow-catalog` | Read-only encoded workflow catalog |

## Organization and field visibility

- The shared header always identifies the current organization. A selector appears for multiple memberships; saved selections are restored only if they still match the authenticated user's memberships. Switching organizations returns to Overview and clears the previous organization's page/form state.
- Navigation requires a selected organization and retains explicit loading/error states. Search filters the destinations returned by the existing server-backed layout and permission flags; it does not grant record access.
- Field users without organization-admin, integration-read, or audit-trail-read access retain the same eight hidden destinations: `program`, `emergency`, `moc`, `import`, `integrations`, `privacy-requests`, `context`, and `workflow-catalog` under `/dashboard/`. This leaves 25 destinations, with no Administration section. Retention remains visible as before.
- Desktop and mobile navigation use the same inventory. The mobile drawer contains keyboard focus, supports Escape, and restores focus when closed.

## Record wayfinding

Breadcrumbs identify the work area, register, and record-detail location. Incident title filters travel through the incident-detail → linked corrective-action → source-incident → Back to incidents journey. Generic register links and breadcrumbs remain direct register destinations; they do not invent a previous filter. No route or navigation change alters a saved status, approval requirement, or source relationship.

## Verification references

- `tests/unit/dashboard/cohesion.test.ts`: exact URL inventory, no duplicates, work-area membership, permit labels, field visibility, nested-route matching, and retained maturity notices.
- `tests/e2e/smoke/corporate-navigation.spec.ts`: authenticated navigation search, reports, organization context, and mobile keyboard behavior.
- `scripts/module-maturity-check.mjs`: routed destination coverage against the module-maturity table.

These are verification paths, not a claim that customer task-completion or engagement has improved. Executed results belong in the redesign QA report.
