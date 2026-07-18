# Project governance

Autonomous EHS is an **open source, long-lived** compliance operations platform. This document states how the project is maintained so self-host adopters, integrators, and contributors can plan beyond a single pilot or demo.

**Try before you fork:** hosted demo at [autonomous-ehs-management.vercel.app](https://autonomous-ehs-management.vercel.app); production adopters should pin [GitHub release tags](https://github.com/SafetyMP/Autonomous-EHS-Management/releases) or container image digests and run their own upgrade testing.

**Product positioning** (what it does, pilot framing, procurement language) stays in [README.md](README.md) and [docs/procurement-readiness.md](docs/procurement-readiness.md). **Regulatory scope and data governance** stay in [COMPLIANCE.md](COMPLIANCE.md).

## Open source evergreen intent

**Evergreen** here means:

- **Forkable system of record** — PostgreSQL schema and Drizzle migrations in-repo; no TypeScript-only “shadow schema.”
- **Trunk-based development** on **`main`** with a public merge bar ([AGENTS.md](AGENTS.md)).
- **Honest scope** — shipped vs planned modules are tracked in [docs/module-maturity.md](docs/module-maturity.md) and [ROADMAP.md](ROADMAP.md), not hidden behind marketing copy.
- **Tenant-owned deployments** — you run Postgres, backups, IAM, and counsel review; the license does not replace ops or compliance work ([docs/open-source-tco.md](docs/open-source-tco.md)).

This is **not** a promise of zero-cost hosting, unlimited free support, or a separate **LTS** release train. There is **no LTS branch** today: production adopters should pin **container image digests** or git SHAs and run their own upgrade testing ([docs/self-host-quickstart.md](docs/self-host-quickstart.md), [REPO_SETUP.md](REPO_SETUP.md)).

## Maintainers and code ownership

Default review ownership is declared in [`.github/CODEOWNERS`](.github/CODEOWNERS) (for example `@SafetyMP/ehs-maintainers` on the default path). Replace placeholder team slugs with your org’s real GitHub teams before relying on ruleset bypass behavior ([REPO_SETUP.md](REPO_SETUP.md)).

| Area | Typical owner path |
|------|-------------------|
| Default / product | `@SafetyMP/ehs-maintainers` (configure for your org) |
| Backend, migrations, scripts | `@SafetyMP/ehs-backend` |
| App Router / UI | `@SafetyMP/ehs-frontend` |
| Deploy, Docker, Vercel | `@SafetyMP/ehs-devops` |
| Compliance-sensitive paths | `@SafetyMP/ehs-compliance` |

Maintainers merge when CI is green and scope matches project conventions ([CONTRIBUTING.md](CONTRIBUTING.md), [.cursor/rules/ehs-ims-conventions.mdc](.cursor/rules/ehs-ims-conventions.mdc)).

## Contribution and quality bar

1. Branch from **`main`**; open a PR using [`.github/pull_request_template.md`](.github/pull_request_template.md).
2. Run **`npm run verify`** locally (eslint → `tsc` → Vitest); use **`npm run verify:all`** when touching smoke-covered UI or cron paths.
3. Schema changes require **`npm run db:generate`** and committed SQL under `drizzle/migrations/`.
4. Regulated mutations should follow existing **`writeAuditLog`** patterns ([docs/qa/mutation-auditability-matrix.md](docs/qa/mutation-auditability-matrix.md)).
5. Conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Contributions are licensed under **Apache 2.0** ([LICENSE](LICENSE)).

## Releases and versioning

- **Application version** in `package.json` follows semver for packaging convenience; it is not a separate commercial SKU.
- **Ship path:** merge to **`main`** → CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) → on CI success, Release + optional container publish ([`.github/workflows/release.yml`](.github/workflows/release.yml), [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml)) → manual production promotion by **git SHA** ([`.github/workflows/cd-promote-production.yml`](.github/workflows/cd-promote-production.yml)).
- **Database upgrades:** apply Drizzle migrations on deploy (`npm run db:migrate` or your orchestrator equivalent). Do not skip migrations across environments.
- **Breaking changes:** call out in PR description and [ROADMAP.md](ROADMAP.md); prefer Drizzle migrations with backward-compatible phases when production data exists.

## Security

Report vulnerabilities through [SECURITY.md](SECURITY.md) (GitHub private vulnerability reporting when enabled). Do not open public issues for exploitable defects.

Dependabot and supply-chain checks are configured per [REPO_SETUP.md](REPO_SETUP.md). Security-sensitive areas include auth session shape, proxy/dashboard gating, cron `CRON_SECRET` routes, integration inbound auth, and RAG ingest paths ([docs/procurement-readiness.md](docs/procurement-readiness.md) §11).

## Decision-making

| Decision type | Where it lives |
|---------------|----------------|
| Product direction (high level) | [ROADMAP.md](ROADMAP.md) |
| Architecture choices (significant) | [docs/adr/](docs/adr/) |
| Stack pins and API map | [CONTEXT.md](CONTEXT.md) |
| Compliance / retention behavior | [COMPLIANCE.md](COMPLIANCE.md) + counsel |
| Agent and contributor workflow | [AGENTS.md](AGENTS.md) |

Substantial workflow or RBAC changes should update diligence docs listed in [AGENTS.md](AGENTS.md) (architecture map, workflow depth, procurement readiness, approval workflow) when behavior shifts.

## Community surfaces

- **Issues:** [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) (bug, feature, compliance change).
- **Documentation index:** [docs/README.md](docs/README.md).
- **User-facing manual:** [docs/user-manual-ehs-console.md](docs/user-manual-ehs-console.md).

There is no requirement to use a specific vendor SaaS to participate. Self-host and managed-host adopters consume the same source tree.

## Forks and downstream products

Apache 2.0 allows forks and commercial redistribution. Downstream maintainers should:

- Preserve license notices and document their own support and compliance posture.
- Not imply OSHA, EPA, or ISO **certification** from the software alone ([COMPLIANCE.md](COMPLIANCE.md)).
- Track their own migration path when pulling upstream schema changes.
