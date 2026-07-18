# Contributing

## First PR in 10 minutes

1. **Fork / branch** from **`main`** (`git checkout -b your-topic`).
2. **Install & verify:** `npm ci` then **`./scripts/verify.sh`** (or `npm run verify` for lint/`tsc`/Vitest only).
3. **Open a PR** using [`.github/pull_request_template.md`](.github/pull_request_template.md) (paste check evidence, including adversarial/threat-model when CI runs them).
4. **Regulated areas** (retention, RAG, incident/CAPA lifecycle): open a **Compliance** issue first — see template in [`.github/ISSUE_TEMPLATE/compliance_change.md`](.github/ISSUE_TEMPLATE/compliance_change.md).

Deep workflow and CI jobs: **[AGENTS.md](AGENTS.md)**. Agent skills: [`.cursor/skills/README.md`](.cursor/skills/README.md).

## Before you start

Read **[AGENTS.md](AGENTS.md)** (site gates + contributor/CI matrix), **[GOVERNANCE.md](GOVERNANCE.md)** (maintainers, releases, evergreen OSS), **[docs/README.md](docs/README.md)** (documentation index), and, when touching regulated workflows, **[COMPLIANCE.md](COMPLIANCE.md)**.

## Workflow

1. Branch from **`main`** (org rulesets may enforce PR-only merges).
2. Run **`./scripts/verify.sh`** locally; use **`npm run verify:all`** or **`./scripts/integration-e2e.sh`** when you touch UI or cron paths covered by smoke E2E.
3. When changing trust boundaries (auth, inbound, SCIM, Context Sync), also run **`./scripts/adversarial.sh`** against a local app URL (see [AGENTS.md](AGENTS.md)).
4. Open a PR that follows **[`.github/pull_request_template.md`](.github/pull_request_template.md)** (linked issue, checks evidence).
5. For compliance / retention / RAG — use the compliance issue template and get the right review path.

## Code owners

Configure **[`.github/CODEOWNERS`](.github/CODEOWNERS)** with real teams before relying on bypass rules (**[REPO_SETUP.md](REPO_SETUP.md)**).

## License & CLA

By contributing, your contributions are under the **Apache License 2.0** (see **[LICENSE](LICENSE)**); confirm you have authority to submit under that license (for example employer **CLA** policy where applicable).
