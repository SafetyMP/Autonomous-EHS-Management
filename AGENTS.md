# Site contract

## Gates

| Command | Purpose |
|---|---|
| `./scripts/verify.sh` | Functional and static acceptance |
| `./scripts/adversarial.sh` | Authorized local adversarial probes |

The corporate handoff fixes scope. The site manager assigns ADRs; site specialists write;
the root orchestrator dispatches nondelegating workers and runs gate commands; operations
excellence reviews immutable root-produced evidence. Work in isolated roots, never edit
corporate approval state, and never self-approve. A site role cannot return work to
corporate design; that boundary requires an explicit user rework authorization.

Site id: `ehs`. Prior Cursor Harness v4 is under `_archives/harness-v4/`.

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

## Threat model

Authoritative cells: [`specs/threat-model.yaml`](specs/threat-model.yaml). Static gate: `./scripts/check-threat-model.sh`. Executable denies: `./scripts/adversarial.sh` (requires `ADVERSARIAL_BASE_URL` / default `http://localhost:3000` and, for global inbound cases, `INTEGRATION_INBOUND_SECRET`).

## Agent skills

Project skills index: [`.cursor/skills/README.md`](.cursor/skills/README.md).
