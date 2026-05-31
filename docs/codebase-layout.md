# Codebase layout

Where application code lives under [`src/`](../src/). Pair with [architecture-map.md](./architecture-map.md) (behavior) and [CONTEXT.md](../CONTEXT.md) (API map and conventions).

## Top-level `src/`

| Path | Responsibility |
|------|----------------|
| [`src/app/`](../src/app/) | Next.js App Router — pages, layouts, route handlers |
| [`src/components/`](../src/components/) | Shared React UI (dashboard shell, field launcher, outbox) |
| [`src/lib/`](../src/lib/) | Client-safe and isomorphic helpers (RBAC keys, workflow, nav, AI gateway) |
| [`src/server/`](../src/server/) | Server-only — DB, tRPC routers, services, cron helpers, jobs |
| [`src/trpc/`](../src/trpc/) | tRPC client wiring for React (`react.tsx`, server caller) |
| [`src/hooks/`](../src/hooks/) | Shared React hooks |
| [`src/proxy.ts`](../src/proxy.ts) | Next.js proxy / middleware entry |
| [`src/instrumentation.ts`](../src/instrumentation.ts) | Startup hooks (AI gateway, demo guards) |

## `src/app/` routes

| Area | Path | Notes |
|------|------|--------|
| Marketing / auth | `(auth)/`, `/` | Sign-in, sign-up |
| Dashboard UI | `dashboard/**` | EHS Console pages; nav from [`dashboard-nav-links.ts`](../src/lib/dashboard-nav-links.ts) |
| tRPC | `api/trpc/[trpc]/` | HTTP adapter |
| Auth | `api/auth/[...all]/` | Better Auth |
| Cron | `api/cron/*` | Reminders, retention, roster reconcile, metrics scrape |
| Integration | `api/integration/inbound/` | HRIS/LMS inbound webhook |
| SCIM | `api/scim/v2/*` | Users / Groups provisioning |
| Context Sync | `api/contextsync/*` | Governed REST for agents/IDE |
| Health | `api/health/` | Liveness + DB ping |

## `src/server/`

| Path | Responsibility |
|------|----------------|
| [`db/schema.ts`](../src/server/db/schema.ts) | Drizzle schema — **single system of record** |
| [`db/index.ts`](../src/server/db/index.ts) | Connection pool (Neon serverless vs `pg`) |
| [`trpc/root.ts`](../src/server/trpc/root.ts) | Router registration |
| [`trpc/routers/`](../src/server/trpc/routers/) | Domain procedures (incident, capa, integration, …) |
| [`services/`](../src/server/services/) | Business logic shared by routers, cron, inbound handlers |
| [`cron/`](../src/server/cron/) | Cron run recording, metrics formatting |
| [`jobs/`](../src/server/jobs/) | pg-boss job definitions |
| [`auth.ts`](../src/server/auth.ts) | Better Auth config |
| [`ratelimit.ts`](../src/server/ratelimit.ts) | Upstash rate limits |

**Naming pattern:** routers stay thin; multi-step domain logic belongs in `services/` (e.g. `actionQueueQuery.ts`, `hrisMembershipSyncIngest.ts`, `scim/`).

## `src/lib/` (selected)

| Path | Topic |
|------|--------|
| [`rbac.ts`](../src/lib/rbac.ts) | Permission keys (`PERMISSIONS`) |
| [`env.ts`](../src/lib/env.ts) | Validated environment variables |
| [`workflow/`](../src/lib/workflow/) | Status transition catalogs |
| [`tasks/actionQueue.ts`](../src/lib/tasks/actionQueue.ts) | Action queue ranking |
| [`integration/`](../src/lib/integration/) | Inbound envelope parsing, connector keys |
| [`ai/gateway.ts`](../src/lib/ai/gateway.ts) | LLM provider gateway |
| [`offline/fieldOutbox.ts`](../src/lib/offline/fieldOutbox.ts) | Field offline queue |

## Repository scripts ([`scripts/`](../scripts/))

| Script | npm command | Purpose |
|--------|-------------|---------|
| `migrate.ts` | `db:migrate` | Apply Drizzle migrations |
| `seed.ts` | `db:seed` | Link admin RBAC after signup |
| `seed-demo.ts` | `db:seed:demo` | Demo org fixtures |
| `seed-ci-e2e.ts` | `db:seed:ci` | CI Playwright seed |
| `demo-up.ts` | `demo:up` | Compose + migrate + demo seed |
| `job-worker.ts` | `job:worker` | pg-boss worker process |
| `portco-pilot-verify.ts` | `portco:pilot-verify` | PortCo staging checks |
| `audit-matrix-greps.sh` | `audit:matrix-greps` | Regenerate auditability grep counts |

## Tests ([`tests/`](../tests/))

| Path | Scope |
|------|--------|
| `tests/unit/` | Pure helpers, ranking, parsers |
| `tests/integration/` | tRPC callers, Context Sync, inbound |
| `tests/e2e/` | Playwright (`@smoke` subset in CI) |
| `tests/evals/` | Golden JSON for AI gateway |
| `tests/helpers/` | Fake DB, shared fixtures |

## Infrastructure (outside `src/`)

| Path | Purpose |
|------|---------|
| [`drizzle/migrations/`](../drizzle/migrations/) | Committed SQL migrations |
| [`deploy/k8s/`](../deploy/k8s/) | Kubernetes manifests + CronJobs |
| [`infra/terraform/`](../infra/terraform/) | Optional EKS starter |
| [`.github/workflows/`](../.github/workflows/) | CI, Docker publish, production promote |
| [`vercel.ts`](../vercel.ts) | Vercel cron schedule |

## Conventions (quick reference)

- **RBAC:** every regulated mutation calls `assertPermission` with keys from [`rbac.ts`](../src/lib/rbac.ts).
- **Audit:** transactional changes write [`audit_log`](../src/server/db/schema.ts) via `writeAuditLog` where peers already do.
- **Schema changes:** edit `schema.ts` → `npm run db:generate` → commit SQL under `drizzle/migrations/`.
- **New router:** add under `src/server/trpc/routers/`, register in [`root.ts`](../src/server/trpc/root.ts).

Full agent rules: [AGENTS.md](../AGENTS.md), [.cursor/rules/ehs-ims-conventions.mdc](../.cursor/rules/ehs-ims-conventions.mdc).
