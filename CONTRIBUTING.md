# Contributing

## Before you start

Read **[AGENTS.md](AGENTS.md)** (verification bar, CI, skills index) and, when touching regulated workflows, **[COMPLIANCE.md](COMPLIANCE.md)**.

## Workflow

1. Branch from **`main`** (org rulesets may enforce PR-only merges).
2. Run **`npm run verify`** locally; use **`npm run verify:all`** when you touch UI or cron paths covered by smoke E2E.
3. Open a PR that follows **[`.github/pull_request_template.md`](.github/pull_request_template.md)** (linked issue, checks evidence).
4. For compliance / retention / RAG — use the compliance issue template and get the right review path.

## Code owners

Configure **[`.github/CODEOWNERS`](.github/CODEOWNERS)** with real teams before relying on bypass rules (**[REPO_SETUP.md](REPO_SETUP.md)**).

## License & CLA

By contributing, your contributions are under the **Apache License 2.0** (see **[LICENSE](LICENSE)**); confirm you have authority to submit under that license (for example employer **CLA** policy where applicable).
