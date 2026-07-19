# ADR-UX-004: Dedicated Playwright a11y project (WCAG 2.2 AA axe)

**Status:** Accepted (site packet PKT-UX-004)  
**Date:** 2026-07-19  
**Program:** `ehs` / corporate UX handoff revision 1  
**Requirements:** Gen-1 chrome + Core-spine a11y CI topology  
**Acceptance:** AC-007, AC-008, AC-019, AC-020, AC-021, AC-022, AC-023  
**Depends on:** ADR-UX-001 (task-first IA), ADR-UX-002 (sole shell + tokens), ADR-UX-003 (status-region-first)  
**Closes:** UD-Q-UX-001 (dedicated a11y project vs bloating `@smoke`)

## Context

PKT-UX-001..003 delivered task-first IA, sole shell/tokens, and status-region-first outbox. Accessibility coverage was limited to lightweight skip-link / landmark `@smoke` checks. Corporate acceptance left **UD-Q-UX-001** open: whether axe WCAG 2.2 AA should expand default smoke or live in a **dedicated Playwright project**.

## Decision

### 1. Dedicated `a11y` Playwright project — AC-007 / AC-020

- Project name: **`a11y`**
- Match: `tests/e2e/a11y/**/*.spec.ts`
- Tooling: `@axe-core/playwright` with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`
- Gate: **serious** and **critical** impacts **fail**; moderate/minor are reported only when asserted elsewhere
- Invoke separately: `npx playwright test --project=a11y` or `npm run test:e2e:a11y`
- **Do not** add axe suite to default `@smoke` grep / `./scripts/integration-e2e.sh` (closes UD-Q-UX-001)

### 2. Gen-1 gated routes

| Surface | Spec | Auth |
|---------|------|------|
| Sign-in | `sign-in.a11y.spec.ts` | none |
| Chrome (skip-link / landmarks) | `chrome-landmarks.a11y.spec.ts` | none |
| Field home | `field-home.a11y.spec.ts` | credentials |
| Incident create | `incident-create.a11y.spec.ts` | credentials |
| CAPA happy path | `capa-happy-path.a11y.spec.ts` | credentials |
| Approvals decide | `approvals-decide.a11y.spec.ts` | credentials |
| Audit-trail list | `audit-trail-list.a11y.spec.ts` | credentials |

Signed-in specs **skip** when `PLAYWRIGHT_E2E_EMAIL` / `PLAYWRIGHT_E2E_PASSWORD` are unset.

### 3. Keyboard field → incident — AC-019

- Executable in the `a11y` project: `keyboard-field-to-incident.a11y.spec.ts` (`@a11y` + `@keyboard`)
- Path: field home (`?view=field`) → focus/activate **Report incident** → fill Title / What happened → Submit via keyboard

### 4. Honesty — AC-008 / AC-023

- **Forbidden:** WCAG 3 conformance verbs (“WCAG 3 conformant”, “WCAG 3 certified”, etc.)
- Allowed: automated **WCAG 2.2 AA rule tags** via axe; manual glare checklist; no claim of full site certification
- Barriers **D-006** / **D-010** remain **blocked** (unchanged)

### 5. Glare + evidence index — AC-021 / AC-022

- Manual glare/contrast checklist: [`docs/qa/glare-contrast-checklist.md`](../qa/glare-contrast-checklist.md)
- Acceptance evidence index AC-001..AC-021: [`docs/qa/ux-acceptance-evidence-index.md`](../qa/ux-acceptance-evidence-index.md)

### 6. CI topology

- `e2e-smoke` job runs `./scripts/integration-e2e.sh` (**@smoke** only), then a **separate** step `npx playwright test --project=a11y`
- Lightweight skip-link checks remain in `tests/e2e/smoke/a11y-shell.spec.ts` for smoke regression without axe runtime cost

## Consequences

- Default smoke duration stays bounded; a11y failures are isolated in CI logs under the Accessibility E2E step
- Gen-1 signed-in a11y requires the same migrate/seed + credentials as Core-spine smoke
- Expanding beyond Gen-1 routes needs a follow-on packet (not this ADR)

## Evidence

| Artifact | Path |
|----------|------|
| A11y test plan | [`docs/qa/a11y-test-plan.md`](../qa/a11y-test-plan.md) |
| Glare contrast checklist | [`docs/qa/glare-contrast-checklist.md`](../qa/glare-contrast-checklist.md) |
| UX acceptance evidence index | [`docs/qa/ux-acceptance-evidence-index.md`](../qa/ux-acceptance-evidence-index.md) |
| Run digest | [`.corp-harness/evidence/adr-ux-004-a11y-run.txt`](../../.corp-harness/evidence/adr-ux-004-a11y-run.txt) |
