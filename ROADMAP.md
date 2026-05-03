# Roadmap (high level)

This file tracks **direction**, not detailed delivery dates. Priorities shift with customer and counsel input.

## Shipped recently

- CI: real env validation via [`.env.ci`](.env.ci), CSP headers, supply-chain audit job.
- Smoke E2E includes signed-in dashboard when Postgres is available ([`seed-ci-e2e`](scripts/seed-ci-e2e.ts)).
- Data retention policies UI and OSHA injury/illness JSON export ([`/dashboard/retention`](src/app/dashboard/retention/page.tsx)).
- Structured production logs ([`src/lib/logger.ts`](src/lib/logger.ts)) and optional cron failure webhook (`CRON_FAILURE_WEBHOOK_URL`).
- **Scaffolding:** OIDC JIT ([`docs/OIDC_JIT_PROVISIONING.md`](docs/OIDC_JIT_PROVISIONING.md)), job queue ([`src/server/jobs/`](src/server/jobs/), [`docs/JOB_QUEUE.md`](docs/JOB_QUEUE.md)), Terraform state docs ([`docs/terraform-remote-state.md`](docs/terraform-remote-state.md)), DSAR intake ([`/dashboard/privacy-requests`](src/app/dashboard/privacy-requests/page.tsx)), OSHA agency placeholder ([`oshaAgencyExportScaffold.ts`](src/lib/regulatory/oshaAgencyExportScaffold.ts)).

## In progress / next

- Observable cron dashboards (metrics + SLOs) beyond optional webhooks.
- Expanded authenticated E2E (incident intake) in CI without flakiness.
- Field mobile UX pass (offline, touch targets) per accessibility skill.

## Barriers (need org input or external systems)

| Item | Why blocked |
|------|-------------|
| **OIDC JIT org provisioning** | **Scaffold shipped** — enable only with IdP/HR policy; see [`docs/OIDC_JIT_PROVISIONING.md`](docs/OIDC_JIT_PROVISIONING.md). |
| **Durable job queue (e.g. pg-boss)** | **Scaffold shipped** — add `pg-boss` + worker; see [`docs/JOB_QUEUE.md`](docs/JOB_QUEUE.md). |
| **Terraform remote state** | **Docs/examples** in [`docs/terraform-remote-state.md`](docs/terraform-remote-state.md) and [`infra/terraform/backend.example.tf`](infra/terraform/backend.example.tf); provision bucket + IAM. |
| **Full DSAR automation** | **Intake only** in-app; export/erasure needs counsel process ([`docs/DSAR_PROCESS.md`](docs/DSAR_PROCESS.md)). |
| **Agency-formatted OSHA filing export** | **Placeholder** only (`compliance.regulatoryOsha.agencyExportPlaceholder`); not filing-ready. |

## Community

- See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) and [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/).
