# Roadmap (high level)

This file tracks **direction**, not detailed delivery dates. Priorities shift with customer and counsel input.

## Shipped recently

- **Cron SLO artifact:** example Prometheus alerting rules in [`deploy/k8s/prometheus-rules-cron.example.yml`](deploy/k8s/prometheus-rules-cron.example.yml) (cross-linked from [`docs/runbooks/cron-metrics-observability.md`](docs/runbooks/cron-metrics-observability.md)).
- **Authenticated `@smoke` E2E:** minimal **inspection** create flow ([`tests/e2e/auth/inspection-intake.spec.ts`](tests/e2e/auth/inspection-intake.spec.ts)) alongside incident + observation intake.
- **Assistive incident drafting:** `aiAssistant.proposeIncidentIntakeDraft` and **Suggest wording (AI)** on [`/dashboard/incidents/new`](src/app/dashboard/incidents/new/page.tsx) (proposal-only; same RBAC/audit posture as observation drafting).
- **Audit trail CSV export:** `compliance.auditTrail.exportCsv` (permission `audit_trail:read`; writes `compliance.audit_trail.export_csv` to `audit_log`) and download control on [`/dashboard/audit-trail`](src/app/dashboard/audit-trail/page.tsx).
- **Incident intake local draft:** browser `localStorage` persistence on [`/dashboard/incidents/new`](src/app/dashboard/incidents/new/page.tsx) (same hook pattern as observation intake); photos remain session-only.
- **AI assistant parse-failure audit:** intake draft procedures write `ai.assistant.draft_parse_failed` to `audit_log` when structured JSON is invalid after repair ([`aiAssistant` router](src/server/trpc/routers/aiAssistant.ts)).
- **Field outbox UX:** failed-row listing, dashboard **Retry failed syncs**, and flush re-trigger via `FieldOutboxUiProvider` / [`docs/offline-field-outbox.md`](docs/offline-field-outbox.md).
- **Cron observability:** `cron_job_run` persistence on success/failure, `GET /api/cron/metrics` (Prometheus text + `?format=json`), same `Bearer CRON_SECRET` gate as cron routes; `.env.ci` includes a synthetic `CRON_SECRET` for Playwright scrape smoke.
- **CI smoke E2E:** `@smoke` incident intake (`tests/e2e/auth/incident-intake.spec.ts`), observation intake, **inspection** intake (`tests/e2e/auth/inspection-intake.spec.ts`), and cron metrics scrape run with the dashboard smoke suite.
- **Field shell:** root `viewport` (device-width, `viewportFit: cover`), safe-area padding on dashboard header and offline banner.
- CI: real env validation via [`.env.ci`](.env.ci), CSP headers, supply-chain audit job.
- Smoke E2E (`@smoke` under `tests/e2e`): home, auth gate, signed-in dashboard when Postgres + [`seed-ci-e2e`](scripts/seed-ci-e2e.ts) are available.
- Data retention policies UI and OSHA injury/illness JSON export ([`/dashboard/retention`](src/app/dashboard/retention/page.tsx)).
- **Ishikawa (fishbone) RCA:** optional six-category cause branches on incident investigation (`rca_fishbone`, [`incident.update`](src/server/trpc/routers/incident.ts), detail form).
- **Structured investigation (bow-tie + sequence + causal factors):** `investigation_bow_tie`, `investigation_chronology`, `investigation_causal_factors` on `incident` ([`structuredInvestigation.ts`](src/lib/investigation/structuredInvestigation.ts), detail form); not branded third-party methodology.
- **OSHA reference CSV sample:** `compliance.regulatoryOsha.agencyReferenceCsvSample` with download on the retention page (not filing-ready; synthetic example row only).
- **Workflow catalog:** read-only encoded transitions via `compliance.workflowCatalog.get` and [`/dashboard/workflow-catalog`](src/app/dashboard/workflow-catalog/page.tsx) (`retention:policy_read`).
- Structured production logs ([`src/lib/logger.ts`](src/lib/logger.ts)) and optional cron failure webhook (`CRON_FAILURE_WEBHOOK_URL`).
- **Scaffolding:** OIDC JIT ([`docs/OIDC_JIT_PROVISIONING.md`](docs/OIDC_JIT_PROVISIONING.md)), job queue ([`src/server/jobs/`](src/server/jobs/), [`docs/JOB_QUEUE.md`](docs/JOB_QUEUE.md)), Terraform state docs ([`docs/terraform-remote-state.md`](docs/terraform-remote-state.md)), DSAR intake ([`/dashboard/privacy-requests`](src/app/dashboard/privacy-requests/page.tsx)), OSHA agency placeholder ([`oshaAgencyExportScaffold.ts`](src/lib/regulatory/oshaAgencyExportScaffold.ts)).

## In progress / next

- **Production dashboards:** wire `GET /api/cron/metrics` alerts per runbook + example `PrometheusRule`; tune SLO windows in your environment.
- **E2E depth:** expand authenticated `@smoke` data setup and optional flake retries for additional flows as features ship.
- **Field UX:** deeper offline drafts, conflict surfacing, and substantive degraded-mode behavior using the accessibility skill playbook (outbox retry + visibility is a first slice).

## Partnership backlog (Innovation Auditor + EHS Program Director)

Joint priorities: **field resilience** and **supervisory actionability** without making AI authoritative over regulated workflows—PostgreSQL, permission-gated tRPC mutations, and `audit_log` (where procedures already record changes) remain the system of truth; see [CONTEXT.md](CONTEXT.md).

- **Offline / outbox capture:** durable **IndexedDB** queue for high-friction intake (incidents, observations, inspections, permits) with **RBAC-preserving replay** and **failed-row retry UX** when `NEXT_PUBLIC_FIELD_OUTBOX=1` — deeper draft recovery and conflict surfacing remain on the roadmap.
- **Assistive drafting on intake:** **Incident** + **observation** context-aware drafting (`aiAssistant` proposal-only patterns, optional RAG); explicit human acknowledgment before persistence; never auto-submit incident/CAPA/permit transitions.
- **Observation follow-up SLA ladder:** SLA-backed follow-up chains (assignment, due dates, escalation tiers, optional CAPA/permit linkage) surfaced in dashboards and metric-friendly hooks aligned with cron observability—not LLM-mediated approval.
- **Leading-indicator analytics:** Postgres-first aggregates in `analytics.*` for repeat hazards, overdue follow-ups, recurrence after CAPA, and related supervisory views; distinguish clearly from statutory/regulatory filings (see barriers table for OSHA agency export gaps).
- **AI / RAG resilience:** timeouts, structured-output repair/retry where safe, visible failure UX, audit-friendly assistant failure telemetry alongside structured logging (`src/lib/logger.ts`).
- **Smoke coverage:** `@smoke` includes incident, observation, and **inspection** intake; extend further as partnership features ship (observation SLA path, additional offline flows).

## Barriers (need org input or external systems)

Execution sequencing and ownership: **[`docs/barrier-resolution-playbook.md`](docs/barrier-resolution-playbook.md)**.

| Item | Why blocked |
|------|-------------|
| **OIDC JIT org provisioning** | **Scaffold shipped** — enable only with IdP/HR policy; see [`docs/OIDC_JIT_PROVISIONING.md`](docs/OIDC_JIT_PROVISIONING.md). |
| **Durable job queue (e.g. pg-boss)** | **Optional:** set `PG_BOSS_ENABLED` and run `npm run job:worker` on a long-lived host; see [`docs/JOB_QUEUE.md`](docs/JOB_QUEUE.md). |
| **Terraform remote state** | **Docs/examples** in [`docs/terraform-remote-state.md`](docs/terraform-remote-state.md) and [`infra/terraform/backend.example.tf`](infra/terraform/backend.example.tf); provision bucket + IAM. |
| **Full DSAR automation** | **Intake only** in-app; export/erasure needs counsel process ([`docs/DSAR_PROCESS.md`](docs/DSAR_PROCESS.md)). |
| **Agency-formatted OSHA filing export** | **Placeholder** only (`compliance.regulatoryOsha.agencyExportPlaceholder`); reference CSV sample (`agencyReferenceCsvSample`) is layout-only—not filing-ready. |

## Community

Autonomous EHS is **Apache 2.0** software intended to stay **maintained and forkable**—see [GOVERNANCE.md](GOVERNANCE.md).

| Surface | Purpose |
|---------|---------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | PR workflow, `npm run verify`, compliance templates |
| [GOVERNANCE.md](GOVERNANCE.md) | Maintainers (`CODEOWNERS`), releases, security, forks |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Expected behavior for contributors and partners |
| [SECURITY.md](SECURITY.md) | Responsible disclosure |
| [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) | Bug, feature, and compliance change intake |
| [docs/module-maturity.md](docs/module-maturity.md) | Honest shipped vs planned scope |

**Ways to participate:** fix docs, extend tests, harden integrations, or self-host and report gaps via issues—no sales conversation required for evaluation ([README.md](README.md) quick start).
