# Staging UAT checklist — desk to field

**Status:** CONDITIONALLY APPROVED until staging sign-off by EHS program leadership (this document is a **procedure for testers**, not a release artifact).

**Purpose:** Turn a desk review into repeatable staging checks: each major area lists **routes** (from the in-app sidebar source [`src/lib/dashboard-nav-links.ts`](../../src/lib/dashboard-nav-links.ts)), what to verify live, and reminders for **RBAC**, **operator friction**, and **audit trail** visibility.

**How to use:** Sign in with **staging** roles that mirror production (e.g. field contributor vs manager vs admin). Complete rows with **Pass / Fail / N/A** and note failures in your defect tracker with route and role.

**Engineering recurrence (cannot replace staging sign-off):** After merges that touch routers, delegated services under `src/server/services/**`, or Context Sync / integration payloads, run **`npm run verify`** locally and (optionally) **`npm run verify:all`** before release; **`npm run audit:matrix-greps`** repeats the mutation-matrix search pass from [`mutation-auditability-matrix.md`](./mutation-auditability-matrix.md) (ripgrep preferred; `find`+`grep` fallback).

| Area | Route(s) | Verify on staging |
|------|----------|-------------------|
| **Command center** | `/dashboard` | KPIs and activity load; home layout matches role (field launcher vs full desk); no broken quick actions; sensitive tiles respect permissions. |
| **Incidents** | `/dashboard/incidents`, `/dashboard/incidents/new`, `/dashboard/incidents/[id]` | Create and open a minimal incident; confirm status/type/severity flow; **without sensitive-read**: see warning banner and **no** full narrative; **with sensitive-read**: full narrative and investigation fields; changes you expect in **Audit trail** appear after saves (not every background action is guaranteed—see [COMPLIANCE.md](../../COMPLIANCE.md)). |
| **Observations** | `/dashboard/observations`, `/dashboard/observations/new`, `/dashboard/observations/[id]` | Create observation; confirm list/detail; follow-up or escalation labels if your org uses them; RBAC prevents cross-site abuse. |
| **Inspections** | `/dashboard/inspections`, `/dashboard/inspections/new`, `/dashboard/inspections/[id]` | Create inspection; complete required fields; confirm readback and any approval handoff your process defines. |
| **CAPA** | `/dashboard/capa` | Create or advance CAPA; approval gate behavior matches [docs/approval-workflow.md](../approval-workflow.md) expectations; auditors can find evidence of status changes where instrumented. |
| **Permits to work (PTW)** | `/dashboard/permits`, `/dashboard/permits/new`, `/dashboard/permits/[id]` | **Not** environmental regulatory permits: confirm hot work / confined-space style workflow, approvals, cancel path; storage of free-text hazards is program-sensitive. |
| **Environmental permits (register)** | `/dashboard/environmental-permits`, `/dashboard/environmental-permits/new`, `/dashboard/environmental-permits/[id]` | Distinct from PTW: regulatory permit metadata, conditions, links; access only for roles with environmental permit permissions. |
| **Planning / risk** | `/dashboard/planning`, `/dashboard/risk-assessments`, `/dashboard/risk-assessments/new`, `/dashboard/risk-assessments/[id]` | Planning roster and risk assessment intake; JSA-style steps if used; linkage to hazards/aspects where applicable. |
| **Metrics** | `/dashboard/analytics` | Dashboards load; export or CSV if enabled does not leak other orgs; restricted metrics hidden for limited roles. |
| **Approvals** | `/dashboard/approvals` | Queue shows pending items; approve/deny paths work; escalation or overdue messaging matches program rules. |
| **Training** | `/dashboard/training` | Assignments or records visible per role; integration-fed completions if staging is wired (see [docs/integration-connector-mapping.md](../integration-connector-mapping.md) if used). |
| **Integrations** | `/dashboard/integrations` | Surface matches staging configuration; inbound secrets not exposed in UI; operational errors are understandable for admins. |
| **Retention & privacy** | `/dashboard/retention`, `/dashboard/privacy-requests` | Policy labels make sense for counsel review; legal hold and retention overrides only for authorized roles; no accidental destructive actions without confirmation. |
| **Audit trail (console)** | `/dashboard/audit-trail` | Date range and filters work; entries align with actions you performed in-session for key entities; gaps documented rather than assumed complete. |
| **Field adjacencies** | `/dashboard/tasks` (Tasks & reviews) | Task list and reviews usable on a laptop or tablet; offline banner or outbox behavior if **field outbox** is enabled in staging (`NEXT_PUBLIC_FIELD_OUTBOX`). |

**Sign-off block (after staging run):**

- Program owner name: __________________  
- Date: __________________  
- Result: **APPROVED FOR PILOT** / **HOLD** (notes): __________________  

---

*Navigation labels in the live app follow `DASHBOARD_NAV_SECTIONS` in [`src/lib/dashboard-nav-links.ts`](../../src/lib/dashboard-nav-links.ts); if the product renames a tab, update this checklist’s route column to match.*
