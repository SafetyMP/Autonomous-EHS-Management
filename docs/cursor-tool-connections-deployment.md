# Cursor tool connections × deployment workflow

This guide explains how **Cursor IDE tool connections** (including MCP servers) relate to shipping Autonomous EHS. It complements [`.cursor/skills/devops-sre/SKILL.md`](../.cursor/skills/devops-sre/SKILL.md), [`REPO_SETUP.md`](../REPO_SETUP.md), and procurement-facing integration language in [`docs/procurement-readiness.md`](./procurement-readiness.md).

## Canonical deployment (system of truth)

Production and staging deployments **must** remain:

| Path | Artifact |
|------|----------|
| CI / merge verification | `.github/workflows/ci.yml` (`npm run verify`, smoke E2E) |
| Container image | `.github/workflows/docker-publish.yml` → GHCR |
| Controlled promotion | `.github/workflows/cd-promote-production.yml` — GitHub Environment **`production`**, optional Vercel prebuilt + EKS rollout |
| Contracts | `src/lib/env.ts`, `vercel.ts`, `deploy/k8s/` |

**Cursor MCP and related connections do not replace** OAuth to GitHub, `VERCEL_TOKEN`, AWS IAM OIDC, or kubernetes RBAC—they are ergonomics layered on those systems.

---

## MCP inventory & scope note

MCP servers are configured **per IDE / team** (Cursor settings → MCP). The repository cannot assert which servers are enabled for every contributor—only document **recommended** connections and boundaries.

Treat each connection as follows:

| Category | MCP / connection examples (when installed) | Safe use vs production |
|---------|--------------------------------------------|-------------------------|
| **Inspect / troubleshoot** | Vercel MCP, Postgres/Neon MCP, Docs proxies (AWS, Azure, Context7), GitHub MCP if available | Inspect deployments, branches, docs, logs *metadata* — **least privilege**, no storing production secrets in IDE prompts |
| **Product data / Slack** | Slack MCP | Runbooks and human notifications during development—not a substitute for Prometheus/Alertmanager in production (`docs/runbooks/cron-metrics-observability.md`) |
| **Programmatic automation** | Cursor SDK (`@cursor/sdk`) elsewhere | Automate **internal** workflows (bots, orchestration)—still calls the same GitHub/AWS/Vercel APIs; keep tokens out of `.env` commits |

**Forbidden patterns:** wiring production **`CRON_SECRET`**, **`DATABASE_URL`**, or IdP credentials into MCP server config shared in repo; granting MCP tools broad write access without the same safeguards as `.github/workflows/`.

---

## Mapping MCP workflows to staging / prod (helpers only)

Use this matrix when onboarding operators who use Cursor:

| Operational task | Canonical mechanism | MCP / IDE helper role |
|--------------------|---------------------|-------------------------|
| Merge to trunk | PR + required checks | None required |
| Build & attest image | `docker-publish.yml` | — |
| Promote prod | Manual `workflow_dispatch` + approvals | Inspect failed Vercel build or rollout context *after the fact* |
| Env parity | `vercel env pull`, terraform outputs, `deploy/k8s/secret.example.yaml` | Vercel / cloud MCP listing env names (not dumping secrets into chat logs) |
| DB schema | Drizzle migrations in `drizzle/migrations/` + `npm run db:migrate` | Neon/MCP branching for **sandbox** URLs only |

---

## Vercel & Neon previews: Drizzle migrations and cron

Teams often combine **Vercel Preview deployments** with **branching Postgres** (e.g. Neon). Apply these rules:

### Schema

1. **Every** preview database must receive **the same migrations** as production (`npm run db:migrate` with that preview `DATABASE_URL` in CI or a manual step). Preview apps must never assume `db:push` without migration history parity.
2. **Authoritative columns/tables live in Drizzle schema + committed SQL migrations** ([ehs-ims conventions](../.cursor/rules/ehs-ims-conventions.mdc)) — not TypeScript-only.

### Cron routes (`/api/cron/*`)

| Runtime | Scheduling |
|---------|-------------|
| **Vercel** | `vercel.ts` configures HTTP crons (`/api/cron/reminders`, `/api/cron/data-retention`, `/api/cron/integration-roster-reconcile`). All use `Authorization: Bearer <CRON_SECRET>`. Preview deployments typically **must not** run duplicate schedules against prod-like data unless intentionally isolated envs. Prefer **staging** projects with isolated DBs when testing cron side effects. |
| **Kubernetes** | `vercel.ts` cron **does not** run inside the cluster. Use `CronJob` manifests under `deploy/k8s/` calling the **same secured routes**. See DevOps skill. |
| **`/api/cron/metrics`** | **Not scheduled** — Prometheus-style scrape endpoint; scrape from your collector (`docs/runbooks/cron-metrics-observability.md`). |

### Data isolation

Branch/preview URLs must avoid pointing at production `DATABASE_URL`. Treat preview DBs as **disposable**: seed with `db:seed:ci` equivalents or sanitized fixtures—not live PHI in regulated pilots.

---

## Related documentation

- [procurement-readiness.md — customer vs internal Cursor tooling](./procurement-readiness.md#customer-facing-integrations-vs-internal-cursor-tooling)
- [REPO_SETUP.md § 11 Cursor IDE](./REPO_SETUP.md#11-cursor-ide-tool-connections-optional)
