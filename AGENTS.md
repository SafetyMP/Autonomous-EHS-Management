# Community contract

This repository delivers **Autonomous EHS**, a self-hosted environmental, health, and safety console for corporate teams: incidents, corrective actions (CAPA), audits, and TRIR-style metrics with **PostgreSQL as the system of record**. Optional AI may suggest wording; humans close records. It does not claim OSHA certification.

There are two separate artifacts. The **full application** lives in `src/` and ships as source and a container. The **public GitHub Pages demo** lives in `demo/`: a buildless, synthetic, read-only walkthrough without authentication, API routes, or database access. `npm run demo:up` starts the full local application environment; it is not the Pages demo.

The current experience centers on a corporate overview and the incident-to-corrective-action journey. Shared work areas are Overview, Actions & approvals, Incidents & observations, Audits & inspections, Programs & risks, Reports & evidence, and separate Administration. Labels and navigation do not confer permissions; existing routes and server-side checks remain authoritative.

## Read only what the task needs

| Need | Source of truth |
|---|---|
| Product scope, local startup, release/package links | [README.md](README.md) |
| Current documentation and implementation map | [docs/README.md](docs/README.md), [docs/codebase-layout.md](docs/codebase-layout.md), [CONTEXT.md](CONTEXT.md) |
| Corporate navigation and user journey | [docs/user-manual-ehs-console.md](docs/user-manual-ehs-console.md), `src/lib/dashboard-nav-links.ts` |
| Static walkthrough and its deployment | [docs/github-pages-demo.md](docs/github-pages-demo.md), `.github/workflows/pages-demo.yml` |
| Full application operation | [docs/self-host-quickstart.md](docs/self-host-quickstart.md), [docs/architecture-map.md](docs/architecture-map.md) |
| Vulnerabilities and compliance boundaries | [SECURITY.md](SECURITY.md), [COMPLIANCE.md](COMPLIANCE.md), [docs/ai-governed-intake.md](docs/ai-governed-intake.md) |

Historical factory/site-contract evidence remains in [docs/factory-overlay.md](docs/factory-overlay.md), `.corp-harness/`, and `_archives/`. Preserve its handoffs, digests, and evidence requirements; it does not activate a corporate harness for ordinary repository work. Dated ADRs, QA dossiers, and screenshots document their recorded revision and are not proof of the current deployment. Use current source and fresh verification for current behavior.

## Commands

| Command | Purpose |
|---|---|
| `npm run verify` | Lint + `tsc` + Vitest (fast local gate) |
| `./scripts/verify.sh` | `npm ci` + `npm run verify` + audit-matrix greps + threat-model |
| `npm run verify:all` | `verify` + Playwright smoke (not full CI) |
| `./scripts/adversarial.sh` | Authorized local adversarial probes |
| `npm run demo:up` then `npm run dev` | Full local app with PostgreSQL and seeded synthetic records; configure `.env.local` first per README |
| `python3 -m http.server 4173 --bind 127.0.0.1` | Serve the separate static demo at `http://127.0.0.1:4173/demo/` from the repo root |
| `npx playwright test --config playwright.demo.config.ts` | Static Pages walkthrough tests; independent of full-app authentication/database tests |

## Layout

| Path | Role |
|---|---|
| `src/app/dashboard/` | EHS console (incidents, CAPA, audits, metrics) |
| `src/server/auth.ts`, `src/server/trpc/context.ts`, `src/server/trpc/init.ts` | Authentication, request context, protected procedures |
| `src/server/db/schema.ts` | Drizzle schema — PostgreSQL system of record |
| `src/server/trpc/routers/`, `src/server/trpc/assertOrgScoped.ts` | Domain mutations, organization scoping, audit integration |
| `src/lib/rbac.ts`, `src/lib/workflow/` | Permission checks and lifecycle transitions; UI visibility is not authorization |
| `demo/`, `tests/demo-pages/` | Separate public synthetic walkthrough and its Playwright tests |
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

The separate [Pages workflow](.github/workflows/pages-demo.yml) tests the static walkthrough and uploads **only `demo/`** from `main`. Pages success does not prove the full application is deployed or healthy. Report local checks, remote CI, package publication, and live deployment checks separately. For a deployed-demo check, run `DEMO_BASE_URL=https://safetymp.github.io/Autonomous-EHS-Management/ npx playwright test --config playwright.demo.config.ts`; this checks the published site, not unpublished local changes.

## Smoke E2E (Playwright `@smoke`)

CI always runs signed-in smoke against service Postgres (`db:migrate` + `db:seed:ci`). Locally, signed-in specs **skip** unless `PLAYWRIGHT_E2E_EMAIL` / `PLAYWRIGHT_E2E_PASSWORD` are set against a migrated, seeded DB (see [`.env.example`](.env.example)).

Primary smoke coverage lives under [`tests/e2e/smoke/`](tests/e2e/smoke/) (dashboard gate, cron auth, integration inbound, Context Sync REST, and related `@smoke` flows). Prefer `./scripts/integration-e2e.sh` or `npm run test:e2e:smoke` over inventing ad-hoc Playwright commands.

## Additional Playwright projects (Calm Focus)

Not grepped by `test:e2e:smoke`. Use after `db:seed:ci` (admin + `e2e.contributor@ci.local`):

| Project | Path | Notes |
|---|---|---|
| `a11y` | `tests/e2e/a11y/` | axe WCAG 2.2 AA; CI e2e-smoke step |
| `density` | `tests/e2e/density/` | Corporate overview KPI-hidden + ≤12 controls; both desk personas (legacy Today test names remain) |
| `visual` | `tests/e2e/visual/` | Screenshot digests → `evidence/calm-focus-visual-manifest.json`; set `PLAYWRIGHT_VISUAL=1` to capture |

Claim lint: `./scripts/check-wcag3-claims.sh` (also wired in CI `verify`). Historical Calm Focus UX package: [`docs/qa/calm-focus-final-dossier.md`](docs/qa/calm-focus-final-dossier.md); preserve its evidence without treating old screenshots as the current corporate overview.

## Threat model

Authoritative cells: [`specs/threat-model.yaml`](specs/threat-model.yaml). Static gate: `./scripts/check-threat-model.sh`. Executable denies: `./scripts/adversarial.sh` (requires `ADVERSARIAL_BASE_URL` / default `http://localhost:3000` and, for global inbound cases, `INTEGRATION_INBOUND_SECRET`).

## Agent skills

Portable path (SkillsMP, Copilot, other agents): [`.github/skills/`](.github/skills/). Cursor-local path: [`.cursor/skills/`](.cursor/skills/) — index [`.cursor/skills/README.md`](.cursor/skills/README.md).

## Coding standards

Path-specific Copilot instructions: [`.github/instructions/`](.github/instructions/).
Repository-wide Copilot file: [`.github/copilot-instructions.md`](.github/copilot-instructions.md).
Copilot code review skill: [`.github/skills/code-review/SKILL.md`](.github/skills/code-review/SKILL.md).
