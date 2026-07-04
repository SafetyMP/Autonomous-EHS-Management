# Contributing

## First PR in 10 minutes

1. **Fork / branch** from **`main`** (`git checkout -b your-topic`).
2. **Install & verify:** `npm ci` then **`npm run verify`** (eslint → `tsc` → Vitest — same bar as CI).
3. **Open a PR** using [`.github/pull_request_template.md`](.github/pull_request_template.md) (paste check evidence).
4. **Regulated areas** (retention, RAG, incident/CAPA lifecycle): open a **Compliance** issue first — see template in [`.github/ISSUE_TEMPLATE/compliance_change.md`](.github/ISSUE_TEMPLATE/compliance_change.md).

Deep workflow, CI jobs, and agent skills: **[AGENTS.md](AGENTS.md)**.

## Before you start

Read **[AGENTS.md](AGENTS.md)** (verification bar, CI, skills index), **[GOVERNANCE.md](GOVERNANCE.md)** (maintainers, releases, evergreen OSS), **[docs/README.md](docs/README.md)** (documentation index), and, when touching regulated workflows, **[COMPLIANCE.md](COMPLIANCE.md)**.

## Workflow

1. Branch from **`main`** (org rulesets may enforce PR-only merges).
2. Run **`npm run verify`** locally; use **`npm run verify:all`** when you touch UI or cron paths covered by smoke E2E.
3. Open a PR that follows **[`.github/pull_request_template.md`](.github/pull_request_template.md)** (linked issue, checks evidence).
4. For compliance / retention / RAG — use the compliance issue template and get the right review path.

## Code owners

Configure **[`.github/CODEOWNERS`](.github/CODEOWNERS)** with real teams before relying on bypass rules (**[REPO_SETUP.md](REPO_SETUP.md)**).

## License & CLA

By contributing, your contributions are under the **Apache License 2.0** (see **[LICENSE](LICENSE)**); confirm you have authority to submit under that license (for example employer **CLA** policy where applicable).
