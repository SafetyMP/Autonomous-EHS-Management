---
applyTo: "**/*.ts,**/*.tsx"
---

# TypeScript coding standards (September 2026)

- Write TypeScript, not new application JavaScript. Leave existing tooling `.js` / `.mjs` / `.cjs` files alone.
- Place imports at the top of the module. Do not use inline `import()` in function bodies except for a documented circular-dependency or optional-runtime case.
- Prefer early returns over nested conditionals.
- On `switch` over a discriminated union or enum, handle every variant. Use a `never` check in `default` so newly added variants fail at compile time.
- Do not introduce `any` in new production code. Prefer `unknown` plus narrowing. Do not use non-null assertions to silence `strict` or `noUncheckedIndexedAccess`.
- Match this repository's existing formatter and linter. Do not add a second style system.
- Keep public unions narrow. Do not widen a literal union to `string` without a spec change.
- Do not weaken fail-closed, human-in-the-loop, tenancy, or verify gates to make types compile.

## This repository

- Next.js App Router + tRPC + Drizzle. PostgreSQL is the system of record.
- AI may draft text. Humans close incidents, CAPAs, and audit findings.
- Do not auto-close a regulated record from model output.
- Node 22 and npm 10 (`packageManager: npm@10.9.2`). Do not regenerate the lockfile with npm 11.
