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
| `./scripts/adversarial.sh` | CI `e2e-smoke` adversarial step (needs a running app URL) |

CI workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs three required jobs (pin in rulesets — see [`REPO_SETUP.md`](REPO_SETUP.md)):

1. **`supply-chain-audit`** — `npm audit --omit=dev --audit-level=high`
2. **`verify`** — lint, `tsc`, Vitest
3. **`e2e-smoke`** — Postgres migrate/seed, Playwright smoke, threat-model (PRs), adversarial probes

Release and GHCR publish run only after a successful CI `workflow_run` on `main`/`master`. Production promote requires a full git SHA (not `latest`).
