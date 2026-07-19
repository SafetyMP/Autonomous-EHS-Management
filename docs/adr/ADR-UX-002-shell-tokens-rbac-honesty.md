# ADR-UX-002: Sole shell composition, token layer, server-backed field Administration hide, R2 honesty

**Status:** Accepted (site packet PKT-UX-002)  
**Date:** 2026-07-19  
**Program:** `ehs` / corporate UX handoff revision 1  
**Requirements:** R-002, R-004, R-005, R-006, R-008, R-011, R-012, R-013  
**Acceptance:** AC-002, AC-004, AC-005, AC-006, AC-009, AC-012, AC-013, AC-014  
**Depends on:** ADR-UX-001 (task-first IA overlay)

## Context

Corporate master-spec §3–4 requires shell/chrome restyle inside the existing authenticated composition, a Tailwind 4 token layer without a mandatory new UI kit, server-backed field Administration hide, cognitive-load single primary CTA on stress views, and R2 honesty (maturity banners, AI proposal-only, no Plumbing→Core via polish, no filing-ready / native-mobile claims).

## Decision

### 1. Sole shell composition (AC-012 / R-011)

Authenticated dashboard chrome remains exclusively:

`src/app/dashboard/layout.tsx` → `DashboardChrome` → `DashboardShell` → `DashboardAuthenticatedLayout`

No parallel `/dashboard` layout tree. Session, org gate, outbox chrome, and nav badges stay on this path. Unique nav hrefs continue to originate from `src/lib/dashboard-nav-links.ts`.

### 2. Token layer without new UI kit (AC-013 / R-012)

Stack stays **Next 16 + React 19 + Tailwind 4**. Design tokens centralize in `src/app/globals.css` (`:root` + `@theme inline`) with thin helpers (`.btn-primary`, `.btn-secondary`, `.btn-primary-soft`, `.touch-target`). No MUI / Chakra / shadcn (or Radix-as-kit) dependency for the redesign.

### 3. Server-backed field Administration hide (AC-014 / R-013 / AC-002)

Field hide of **Administration** remains:

1. Server: `organization.dashboardHomeLayout` resolves `layout`, `isAdmin`, and permission flags via `userHasPermission`.
2. Client filter: `filterDashboardNavSections` / `navSectionsForUser` consume those flags only.
3. Nav hide is defense-in-depth; page-level `assertPermission` remains authoritative.
4. CSS-only or client-invented `isField` without server confirmation is forbidden.

### 4. One primary CTA on stress views (AC-004 / R-004)

Action regions enforce ≤1 filled primary control:

| Region | Surface | Primary | Secondary |
|--------|---------|---------|-----------|
| Today queue row | `DashboardActionQueueHero` | `.btn-primary` CTA | secondary list links |
| Field Today start | `DashboardFieldLauncher` | one `.btn-primary-soft` lead | other intake as `.btn-secondary` |
| Capture create | `/dashboard/incidents/new` | Submit `.btn-primary` | Cancel + AI Suggest `.btn-secondary` |
| Decide approve/reject | `/dashboard/approvals` | Approve (or Review) `.btn-primary` | Reject `.btn-secondary` |

AI Suggest is never the sole emphasized control. Destructive / reopen / override never default primary.

### 5. R2 honesty invariants (AC-005, AC-006, AC-009)

- `ModuleMaturityBanner` keeps `role="note"` on Banner=Yes routes; removal requires promotion + counsel, not polish.
- AI draft paths remain proposal-only with visible `role="alert"` failure; no auto status transitions.
- Plumbing stays out of four-mode primary chrome (ADR-UX-001).
- No filing-ready / agency SoR / native App Store claims (claim-lint + D-006 blocked).

## Consequences

- Shell restyles must update the four composition files + token CSS; forking a second layout fails AC-012.
- Stress templates should prefer `.btn-primary` / `.btn-secondary` helpers for lintable CTA counts.
- Staging UAT desk↔field journeys (J1–J4) recorded in `docs/qa/staging-uat-desk-to-field.md`.

## Evidence

| Artifact | Path |
|----------|------|
| Shell composition review | [`docs/qa/shell-composition-review.md`](../qa/shell-composition-review.md) |
| Cognitive-load CTA checklist | [`docs/qa/cognitive-load-primary-cta-checklist.md`](../qa/cognitive-load-primary-cta-checklist.md) |
| Staging UAT desk↔field | [`docs/qa/staging-uat-desk-to-field.md`](../qa/staging-uat-desk-to-field.md) |
| Cohesion tests | `tests/unit/dashboard/cohesion.test.ts` |
| Verify digest | [`.corp-harness/evidence/adr-ux-002-verify.txt`](../../.corp-harness/evidence/adr-ux-002-verify.txt) |
