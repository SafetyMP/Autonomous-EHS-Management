# A11y test plan (ADR-UX-004 / AC-007 / AC-019 / AC-020)

## Scope

Gen-1 automated accessibility for EHS Console chrome and Core-spine surfaces using Playwright project **`a11y`**.

**In scope**

- axe-core with WCAG **2.2 AA** tags (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`)
- Fail on **serious** / **critical** impacts only
- Keyboard field home → incident create (AC-019)
- Unauthenticated: sign-in, marketing skip-link / landmarks

**Out of scope (this gen)**

- Full module inventory beyond Gen-1 routes
- Claiming WCAG 3 conformance (AC-008 — forbidden)
- Moving axe into default `@smoke` (UD-Q-UX-001 closed by dedicated project)

## Commands

```bash
# Dedicated project only
npx playwright test --project=a11y
# or
npm run test:e2e:a11y

# Lightweight smoke landmarks (not axe)
npx playwright test tests/e2e/smoke/a11y-shell.spec.ts
```

CI: after `./scripts/integration-e2e.sh`, job step **Accessibility E2E (axe WCAG 2.2 AA)** runs `--project=a11y`.

## Credentials

Signed-in specs skip unless **all** of:

- `PLAYWRIGHT_E2E_EMAIL`
- `PLAYWRIGHT_E2E_PASSWORD`
- `CI=true` **or** `PLAYWRIGHT_E2E_FORCE=1`

Rationale: `playwright.config.ts` loads `.env.ci`, which injects fixture emails even when local Postgres is absent. Requiring CI/FORCE avoids false-red timeouts; CI always sets `CI=true` with migrate + `db:seed:ci`. Local unauthenticated axe specs always run.

## Spec map

| Spec | Route / path | Tags |
|------|----------------|------|
| `sign-in.a11y.spec.ts` | `/sign-in` | `@a11y` |
| `chrome-landmarks.a11y.spec.ts` | `/`, `/sign-in` | `@a11y` |
| `field-home.a11y.spec.ts` | `/dashboard?view=field` | `@a11y` |
| `incident-create.a11y.spec.ts` | `/dashboard/incidents/new` | `@a11y` |
| `capa-happy-path.a11y.spec.ts` | `/dashboard/capa` | `@a11y` |
| `approvals-decide.a11y.spec.ts` | `/dashboard/approvals` | `@a11y` |
| `audit-trail-list.a11y.spec.ts` | `/dashboard/audit-trail` | `@a11y` |
| `keyboard-field-to-incident.a11y.spec.ts` | field → incident submit | `@a11y` `@keyboard` |

Helper: `tests/e2e/a11y/helpers/axe-wcag22.ts` → `expectNoSeriousCriticalAxeViolations`.

## Manual companions

- Glare / outdoor contrast: [glare-contrast-checklist.md](./glare-contrast-checklist.md) (AC-021)
- Acceptance index: [ux-acceptance-evidence-index.md](./ux-acceptance-evidence-index.md) (AC-022)

## Pass / fail honesty

| Result | Meaning |
|--------|---------|
| axe serious/critical = 0 on exercised route | AC-007 / AC-020 satisfied for that route |
| skipped (no credentials) | Not a green invent — record skip in evidence |
| moderate/minor only | Does not fail Gen-1 gate; track in follow-ups |
| No WCAG 3 language | AC-008 |
