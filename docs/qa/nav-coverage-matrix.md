# Nav coverage matrix (ADR-UX-001 / AC-011)

**Source:** `DASHBOARD_NAV_SECTIONS` after task-first regroup.  
**Rule:** Every href appears in exactly one section; primary task sections precede breadth; Plumbing never in `cluster: "primary"`.

| # | Section | Cluster | Href | Placement notes |
|---|---------|---------|------|-----------------|
| 1 | Today | primary | `/dashboard` | Core command center |
| 2 | Today | primary | `/dashboard/tasks` | Core task hub |
| 3 | Capture | primary | `/dashboard/incidents` | Core spine |
| 4 | Capture | primary | `/dashboard/observations` | Intake adjacency |
| 5 | Capture | primary | `/dashboard/inspections` | Core spine |
| 6 | Capture | primary | `/dashboard/permits` | PTW only — not env permits |
| 7 | Decide | primary | `/dashboard/approvals` | Core spine |
| 8 | Decide | primary | `/dashboard/capa` | Core spine (UD-P-UX-002) |
| 9 | Prove | primary | `/dashboard/audit-trail` | Core spine; evidence-only Prove |
| 10 | Prove | primary | `/dashboard/documents` | Evidence adjacency |
| 11 | Plan & programme | secondary | `/dashboard/planning` | Progressive disclosure |
| 12 | Plan & programme | secondary | `/dashboard/heat-program` | Connected aid |
| 13 | Plan & programme | secondary | `/dashboard/risk-assessments` | Connected |
| 14 | Plan & programme | secondary | `/dashboard/environment` | Connected |
| 15 | Plan & programme | secondary | `/dashboard/chemicals` | Plumbing — not primary |
| 16 | Plan & programme | secondary | `/dashboard/environmental-permits` | Copy-separated from PTW |
| 17 | Assure & improve | secondary | `/dashboard/audits` | ISO internal audit programme |
| 18 | Assure & improve | secondary | `/dashboard/assurance` | Connected hub |
| 19 | Assure & improve | secondary | `/dashboard/management-review` | Connected |
| 20 | Records & metrics | secondary | `/dashboard/rag` | Knowledge corpus |
| 21 | Records & metrics | secondary | `/dashboard/retention` | Retention admin |
| 22 | Records & metrics | secondary | `/dashboard/analytics` | Metrics — not Prove |
| 23 | Records & metrics | secondary | `/dashboard/analytics/incidence-rates` | Analytics — not Prove |
| 24 | People | secondary | `/dashboard/training` | Connected |
| 25 | People | secondary | `/dashboard/contractors` | Connected |
| 26 | Administration | secondary | `/dashboard/program` | Hidden for field non-admin |
| 27 | Administration | secondary | `/dashboard/emergency` | |
| 28 | Administration | secondary | `/dashboard/moc` | |
| 29 | Administration | secondary | `/dashboard/import` | Plumbing |
| 30 | Administration | secondary | `/dashboard/integrations` | |
| 31 | Administration | secondary | `/dashboard/privacy-requests` | Plumbing |
| 32 | Administration | secondary | `/dashboard/context` | |
| 33 | Administration | secondary | `/dashboard/workflow-catalog` | |

## Field shell notes

- Secondary clusters remain reachable when permitted; only **Administration** is filtered for field users without admin/integration/audit-trail read.
- Progressive disclosure: secondary `<details>` closed unless `sectionContainsPath`.
- `scripts/module-maturity-check.mjs` must stay 1:1 with this href set.

## Orphan check

No routed nav href omitted; no duplicate href across sections. Executable: cohesion tests + module-maturity-check.
