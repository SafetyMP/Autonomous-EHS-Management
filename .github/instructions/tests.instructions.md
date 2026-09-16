---
applyTo: "**/*.{test,spec}.ts,**/*.{test,spec}.tsx,**/tests/**/*.ts,**/tests/**/*.tsx"
---

# Test standards (September 2026)

- Ship behavior with a test in the existing layout (co-located `*.test.ts` or `tests/`).
- Do not skip, delete, or weaken verify, lint, typecheck, or adversarial gates to land a change.
- Do not invent a passing gate from prose. Run the documented verify command.
- Fixtures are synthetic. Never commit real PII, PHI, payroll, or credentials.

## This repository

- Fast gate: `npm run verify`. Full local gate: `./scripts/verify.sh`.
- Playwright smoke lives under `tests/e2e/smoke/`. Do not invent ad-hoc e2e commands when `npm run test:e2e:smoke` exists.
