# Corporate EHS redesign: implementation and verification

Date: 2026-11-14
Repository baseline: `46a80db43a9380d10ce7d8679b354f81b4bac298`
Local branch: `codex/corporate-ehs-redesign`
Status: implemented and independently reviewed locally. This report records local verification before publication; remote CI and pull-request readiness are tracked in the pull request. No production deployment is claimed.

## Delivered

- Six named corporate work areas, separate Administration, search, longest-match active navigation, breadcrumbs, mobile focus containment and restoration.
- Shared organization selector; per-user, per-tab preference validated against current membership. Switching organization returns to overview and remounts record forms.
- Corporate overview with four permission-scoped measures, visible attention items, existing assigned-work queue, disclosed full KPI catalogue and secondary tools. Product announcements follow the main work surface.
- Incident summary and linked corrective actions near the top, direct CAPA details and source return, explicit error states, and incident title-filter persistence through the journey.
- Corrective-action progress shows server-confirmed status. Verification smoke now checks persisted status after reload, not the static stepper label.
- Current user manual and navigation coverage matrix updated; historical approvals and evidence preserved.

All 33 existing navigation destinations retain their URLs. Server procedures, database schema, RBAC definitions, regulated transitions, and AI authority are unchanged. Existing field Administration exclusions and module-maturity disclosures remain. No cross-organization reporting was added.

## Executed checks

| Check | Result | Evidence |
|---|---|---|
| `npm run verify` (lint, TypeScript, tests with coverage) | PASS: 92 files, 463 tests | [Log](logs/verify.txt) |
| Production `npm run build` | PASS | [Log](logs/build.txt) |
| `npm run test:e2e:smoke -- --workers=4` | 35 passed, 2 skipped | [Log](logs/smoke.txt) |
| Incident/CAPA journey after mobile anchor adjustment | PASS: rapid typing, URL reset, source/filter return and mobile target clearance | [Log](logs/mobile-journey.txt) |
| Accessibility + density suites, signed-in opt-in | Initial 11 passed, 2 document-title failures; both failures passed focused follow-up | [Initial log](logs/accessibility-density-initial.txt), [follow-up](logs/accessibility-followup.txt) |
| Density | Supervisor: 9 main controls; contributor: 5. Full KPI catalogue collapsed; corporate summary visible | [Log](logs/accessibility-density-initial.txt) |
| Audit matrix | PASS | [Log](logs/audit-matrix.txt) |
| Threat model | PASS | [Log](logs/threat-model.txt) |
| Module maturity/navigation coverage | PASS: 33 routes, 33 rows | [Log](logs/module-maturity.txt) |
| `git diff --check` | PASS | Coordinator final check |

The two skipped smoke checks require `NEXT_PUBLIC_FIELD_OUTBOX=1`; this local test instance used the flag-off configuration. The two initial accessibility failures occurred on approvals and audit-trail pages with absent document titles during loading; focused reruns passed without suppressing rules or changing those pages. The initial results are retained, and timing sensitivity remains a test limitation.

## Independent review

A separate native read-only reviewer inspected the combined diff, permission/workflow preservation, organization context, navigation, error states, and loaded screenshots. It did not implement the changes.

Findings resolved:

1. Incident title filtering could diverge from URL state on same-route navigation. Fixed and covered by rapid typing, sidebar reset, and complete incident/CAPA round-trip checks.
2. New section anchors could land under the taller mobile header. Measured at 390×844, adjusted responsive scroll margins, visually rechecked, and added a geometry assertion.

The final reviewer reported no unresolved actionable findings. Coordinator browser testing additionally identified and fixed hidden disclosure descendants in the mobile focus trap. Existing lifecycle smoke assertions were strengthened after manual inspection found they could pass before the verification mutation completed.

## Visual evidence

Captured from loaded local pages using synthetic test data, not production customer records:

- [Overview preview](overview-preview.jpg) and [full overview](overview.jpg)
- [Incident](incident.jpg)
- [Corrective action and source](corrective-action.jpg)
- [Mobile action section after anchor fix](mobile-action.jpg)

## Environment and limits

Existing Next.js / React / TypeScript stack and lockfile retained. Node 22.23.2, npm 10.9.8. Tests used an isolated portable PostgreSQL 18.6 instance with pgvector 0.8.7 at `127.0.0.1:55432`, seeded from the repository's synthetic CI fixtures. No system database service or production connection was introduced.

The app preview is at `http://127.0.0.1:3000/dashboard` while the local development process is running. Test credentials are the synthetic values already documented in `.env.ci`. Database data and portable binaries are under `/private/tmp/ehs-postgres`; the local cluster can be stopped with its `native/bin/pg_ctl -D /private/tmp/ehs-postgres/data stop` command.

Dependency installation reported 37 advisories (36 moderate, 1 high) in the existing locked dependency tree. Dependencies were not changed or remediated in this interface revision. No production rollout or security certification is claimed.

Customer task-completion, preference, and engagement improvements remain unmeasured. These checks establish local implementation behavior, not customer adoption.
