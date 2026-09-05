# Community contract

This repository is a **self-hosted EHS console**: incidents, CAPA, audits, and TRIR-style metrics with **PostgreSQL as the system of record**. Optional AI may suggest wording; humans close records. It does not claim OSHA certification.

Corporate factory overlay (site contract / handoff): [docs/factory-overlay.md](docs/factory-overlay.md).

## Commands

| Command | Purpose |
|---|---|
| `npm run verify` | Lint + `tsc` + Vitest (fast local gate) |
| `./scripts/verify.sh` | `npm ci` + `npm run verify` + audit-matrix greps + threat-model |
| `npm run verify:all` | `verify` + Playwright smoke (not full CI) |
| `./scripts/adversarial.sh` | Authorized local adversarial probes |
| `npm run demo:up` then `npm run dev` | Turnkey local demo |

## Layout

| Path | Role |
|---|---|
| `src/app/dashboard/` | EHS console (incidents, CAPA, audits, metrics) |
| `src/server/db/schema.ts` | Drizzle schema — PostgreSQL system of record |
| `src/server/trpc/routers/` | Domain procedures |
| `src/lib/` | RBAC, workflow transitions, AI gateway |
| `docs/` | Architecture, compliance, operator docs |
| `tests/` | Vitest + Playwright |
| `.github/skills/` | Portable agent skills (SkillsMP / Copilot) |
| `.cursor/skills/` | Cursor-local skills |

Full map: [docs/codebase-layout.md](docs/codebase-layout.md).

## Always

- Keep AI **proposal-only**: drafts and policy excerpts, never authoritative record state.
- Persist regulated changes through permission-gated mutations with audit logs.
- Run `npm run verify` or `./scripts/verify.sh` before claiming a change is done.
- Treat humans as the closer of incidents, CAPAs, and audit findings.

## Ask first

- Incident / CAPA / audit lifecycle or status-machine changes.
- Schema migrations, RBAC keys, retention, RAG, or compliance surfaces.
- Auth, inbound webhooks, SCIM, or Context Sync trust boundaries.
- Weakening, skipping, or replacing verify / threat-model / adversarial gates.

## Never

- Never auto-close incidents or CAPAs (or change regulated status) from AI output.
- Never claim OSHA certification or official OSHA filings from in-app metrics.
- Never commit secrets or enable `DEMO_MODE` in production.
- Never weaken `./scripts/verify.sh` / `npm run verify`.

---

# Contributor / CI gates

| Local | Mirrors |
|---|---|
| `npm run verify` | CI job `verify` (lint + `tsc` + Vitest) |
| `./scripts/verify.sh` | CI `verify` + threat-model check |
| `npm run verify:all` | `verify` + Playwright smoke (not full CI) |
| `./scripts/integration-e2e.sh` | Same smoke path as CI `e2e-smoke` (before adversarial) |
| `./scripts/adversarial.sh` | CI `e2e-smoke` adversarial step (needs a running app URL) |

CI workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs three required jobs (pin in rulesets — see [`REPO_SETUP.md`](REPO_SETUP.md)):

1. **`supply-chain-audit`** — `npm audit --omit=dev --audit-level=high`
2. **`verify`** — lint, `tsc`, Vitest
3. **`e2e-smoke`** — Postgres migrate/seed, Playwright smoke, threat-model (PRs), adversarial probes

On trunk pushes, CI jobs **`release`** and **`publish`** run only after `supply-chain-audit`, `verify`, and `e2e-smoke` succeed (`needs:`). Production promote requires a full git SHA (not `latest`).

## Smoke E2E (Playwright `@smoke`)

CI always runs signed-in smoke against service Postgres (`db:migrate` + `db:seed:ci`). Locally, signed-in specs **skip** unless `PLAYWRIGHT_E2E_EMAIL` / `PLAYWRIGHT_E2E_PASSWORD` are set against a migrated, seeded DB (see [`.env.example`](.env.example)).

Primary smoke coverage lives under [`tests/e2e/smoke/`](tests/e2e/smoke/) (dashboard gate, cron auth, integration inbound, Context Sync REST, and related `@smoke` flows). Prefer `./scripts/integration-e2e.sh` or `npm run test:e2e:smoke` over inventing ad-hoc Playwright commands.

## Additional Playwright projects (Calm Focus)

Not grepped by `test:e2e:smoke`. Use after `db:seed:ci` (admin + `e2e.contributor@ci.local`):

| Project | Path | Notes |
|---|---|---|
| `a11y` | `tests/e2e/a11y/` | axe WCAG 2.2 AA; CI e2e-smoke step |
| `density` | `tests/e2e/density/` | Today KPI-hidden + ≤12 controls; both desk personas |
| `visual` | `tests/e2e/visual/` | Screenshot digests → `evidence/calm-focus-visual-manifest.json`; set `PLAYWRIGHT_VISUAL=1` to capture |

Claim lint: `./scripts/check-wcag3-claims.sh` (also wired in CI `verify`). UX package summary: [`docs/qa/calm-focus-final-dossier.md`](docs/qa/calm-focus-final-dossier.md).

## Threat model

Authoritative cells: [`specs/threat-model.yaml`](specs/threat-model.yaml). Static gate: `./scripts/check-threat-model.sh`. Executable denies: `./scripts/adversarial.sh` (requires `ADVERSARIAL_BASE_URL` / default `http://localhost:3000` and, for global inbound cases, `INTEGRATION_INBOUND_SECRET`).

## Agent skills

Portable path (SkillsMP, Copilot, other agents): [`.github/skills/`](.github/skills/). Cursor-local path: [`.cursor/skills/`](.cursor/skills/) — index [`.cursor/skills/README.md`](.cursor/skills/README.md).
