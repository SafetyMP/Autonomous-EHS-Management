---
applyTo: "**/*.{test,spec}.ts,**/*.{test,spec}.tsx,**/tests/**/*.ts,**/tests/**/*.tsx"
---

# Test standards

- Ship behavior with a test in the existing layout (co-located `*.test.ts` or `tests/`).
- Do not skip, delete, or weaken verify, lint, typecheck, or adversarial gates to land a change.
- Do not invent a passing gate from prose. Run the documented verify command.
- Fixtures are synthetic. Never commit real PII, PHI, payroll, or credentials.

## This repository

- Fast gate: `npm run verify`. Full local gate: `./scripts/verify.sh`.
- Playwright smoke lives under `tests/e2e/smoke/`. Do not invent ad-hoc e2e commands when `npm run test:e2e:smoke` exists.
- The separate static Pages suite lives under `tests/demo-pages/`: run `npx playwright test --config playwright.demo.config.ts`. Its local Python server serves `/demo/`; it does not start Next.js or PostgreSQL.
- To verify the published walkthrough, use `DEMO_BASE_URL=https://safetymp.github.io/Autonomous-EHS-Management/ npx playwright test --config playwright.demo.config.ts`. This is live-site evidence, not verification of unpublished edits.
- Demo accessibility and navigation checks do not establish full-app authentication, permission enforcement, data persistence, or compliance. Preserve the full-app tests and report each result with its scope.
