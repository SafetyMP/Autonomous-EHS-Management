# Contributing

Help improve corporate EHS navigation, the incident-to-corrective-action workflow, deployment reliability, and clear documentation. The [roadmap](ROADMAP.md) describes priorities; the [module maturity map](docs/module-maturity.md) distinguishes implemented capabilities from scaffolds.

## First PR

1. Fork or branch from `main`.
2. Use Node.js 22 and npm 10.9.2; install dependencies with `npm ci`.
3. Read [AGENTS.md](AGENTS.md) for the repository verification requirements and [CONTEXT.md](CONTEXT.md) for architecture and permission boundaries.
4. Make a focused change and run the applicable checks below.
5. Open a PR using [the template](.github/pull_request_template.md), with the problem, resulting behavior, and verification evidence.

For retention, RAG safety, regulatory behavior, or incident/CAPA lifecycle changes, open a [Compliance issue](.github/ISSUE_TEMPLATE/compliance_change.md) first and follow [COMPLIANCE.md](COMPLIANCE.md). Use [SUPPORT.md](SUPPORT.md) for troubleshooting and [SECURITY.md](SECURITY.md) for private vulnerability reports.

## Two surfaces, one repository

| Change | Boundary to preserve | Verification |
|---|---|---|
| Full application (`src/`, database, server) | Authentication, organization scope, RBAC, workflow transitions, and human approvals | `./scripts/verify.sh`; applicable integration and browser checks from [AGENTS.md](AGENTS.md) |
| Public walkthrough (`demo/`) | Static, synthetic, read-only examples; no backend credentials or operational data | `npx playwright test --config playwright.demo.config.ts` |
| Documentation or metadata | Accurate product claims, working links, and clear demo/package distinction | Check affected links and commands; run repository checks required by [AGENTS.md](AGENTS.md) |

The walkthrough may illustrate a workflow; it must not suggest that it has performed a backend action. Full-application permission checks must not be loosened to make a demo work.

## Workflow and checks

- `npm run verify` runs lint, TypeScript checks, and unit tests. `./scripts/verify.sh` additionally installs dependencies and runs audit-matrix and threat-model checks.
- For smoke-covered UI or cron changes, run `npm run verify:all` or `./scripts/integration-e2e.sh` with the documented database setup. Corporate navigation, overview, and workflow UI changes also need the applicable accessibility and density checks in [AGENTS.md](AGENTS.md).
- For auth, inbound integrations, SCIM, or Context Sync changes, run `./scripts/adversarial.sh` against a local application as described in [AGENTS.md](AGENTS.md).
- Schema changes require generated, reviewed Drizzle migrations. Keep seed data and permissions aligned with the schema.
- State which checks passed, failed, or were not run and why. Link CI results for the actual PR commit; do not present a local pass as deployed validation.
- Use a clear Conventional Commit-style PR title such as `fix: preserve incident filter context` or `docs: clarify self-hosted setup`; release automation uses conventional commit analysis.

Update current documentation when behavior changes. Preserve historical decision and verification records, marking their scope instead of treating them as current instructions. Keep significant product and architecture changes consistent with [GOVERNANCE.md](GOVERNANCE.md).

## Code owners and review

[CODEOWNERS](.github/CODEOWNERS) declares review ownership. Follow [REPO_SETUP.md](REPO_SETUP.md) when configuring repository rules; do not assume documented protection is active on every fork. Substantial changes should receive independent review, including permission and workflow effects where relevant.

## License and community

Contributions are under the [Apache License 2.0](LICENSE). Confirm that you have authority to submit your contribution, including any employer requirements. Participation follows the [Code of Conduct](CODE_OF_CONDUCT.md).
