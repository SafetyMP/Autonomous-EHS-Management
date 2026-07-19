# ADR-UX-001: Task-first IA — Today / Capture / Decide / Prove

**Status:** Accepted (site packet PKT-UX-001)
**Date:** 2026-07-19
**Program:** `ehs` / corporate UX handoff revision 1
**Requirements:** R-001, R-010; acceptance AC-001, AC-003, AC-010, AC-011, AC-023
**Closes:** UD-P-UX-001 (Prove = audit/evidence-only), UD-P-UX-002 (CAPA under Decide)

## Context

Corporate master-spec §2 requires primary chrome to answer “what do I do next?” via four task modes, while preserving Core spine deep links and keeping Connected/Plumbing out of peer-Core placement. The prior sidebar used lifecycle folders (**Report & respond**, **Permits**, **Corrective action**, …), which mixed Approvals into Today and placed CAPA and audit trail outside Decide/Prove.

## Decision

Regroup `DASHBOARD_NAV_SECTIONS` as follows. **Labels and section titles change; hrefs do not.**

| Mode / cluster | Title | Items (hrefs unchanged) |
|----------------|-------|-------------------------|
| **Primary** | **Today** | `/dashboard`, `/dashboard/tasks` |
| **Primary** | **Capture** | `/dashboard/incidents`, `/dashboard/observations`, `/dashboard/inspections`, `/dashboard/permits` (PTW adjacency) |
| **Primary** | **Decide** | `/dashboard/approvals`, `/dashboard/capa` |
| **Primary** | **Prove** | `/dashboard/audit-trail`, `/dashboard/documents` (evidence adjacency) |
| **Secondary** | Plan & programme | planning, heat-program, risk-assessments, environment, chemicals, **environmental-permits** |
| **Secondary** | Assure & improve | audits, assurance, management-review |
| **Secondary** | Records & metrics | rag, retention, analytics, incidence-rates |
| **Secondary** | People | training, contractors |
| **Secondary** | Administration | program, emergency, moc, import, integrations, privacy, context, workflow-catalog |

### Binding rules

1. **Prove is audit/evidence-only** — Metrics and incidence rates stay under secondary **Records & metrics** (closes UD-P-UX-001).
2. **CAPA lives under Decide** with Approvals (closes UD-P-UX-002).
3. **PTW vs env permits** — PTW under Capture; regulatory env permits under Plan & programme. No undifferentiated shared “Permits” primary section.
4. **Connected/Plumbing** only via secondary progressive clusters (`cluster: "secondary"` + collapsed disclosure in chrome); never peer Core.
5. **Maturity tiers unchanged** by this regroup alone — `docs/module-maturity.md` rows and Banner flags stay as-is.
6. **Core spine hrefs preserved exactly:** incidents, capa, inspections, approvals, audit-trail.

### Progressive disclosure

`DashboardGroupedNav` always shows primary modes expanded on the sidebar; secondary sections use `<details>` collapsed unless the current path is inside that section. Field filter continues to hide **Administration** for non-admin field users (`dashboard-nav-filter.ts`).

## Consequences

- User manual and QA IA maps must cite the four modes.
- Cohesion tests assert mode membership and Plumbing exclusion from primary chrome.
- Analytics deep links remain valid under Records & metrics; Prove does not surface them.
- Claim blockers **D-006** (native mobile) and **D-010** (offline photos) remain **blocked** — this ADR does not authorize those claims (AC-023).

## Evidence

| Artifact | Path |
|----------|------|
| IA task-mode map | [`docs/qa/ia-task-mode-map.md`](../qa/ia-task-mode-map.md) |
| Nav coverage matrix | [`docs/qa/nav-coverage-matrix.md`](../qa/nav-coverage-matrix.md) |
| Permit taxonomy copy audit | [`docs/qa/permit-taxonomy-copy-audit.md`](../qa/permit-taxonomy-copy-audit.md) |
| Persona journey map | [`docs/qa/ux-persona-journey-map.md`](../qa/ux-persona-journey-map.md) |
| Verify digest | [`.corp-harness/evidence/adr-ux-001-verify.txt`](../../.corp-harness/evidence/adr-ux-001-verify.txt) |
