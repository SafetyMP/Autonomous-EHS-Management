## Project identity

**Autonomous EHS Management System** — Next.js IMS-style application with ISO-aligned domains (incidents, CAPA, documents, audits, obligations, planning, training, RAG-assisted context). PostgreSQL via Drizzle is the **single system of record** for regulated state; client and LLM outputs are never authoritative until validated and persisted through approved procedures.

**Naming / “autonomous”:** externally, autonomy is **deterministic program automation** (cron/SLA escalation paths, integrations, outbox replay) plus **human-validated assistive AI**—not LLM-owned workflow transitions. See [docs/procurement-readiness.md](docs/procurement-readiness.md) and [docs/ai-governed-intake.md](docs/ai-governed-intake.md).

## Mandatory reading order (before any PR)

1. [AGENTS.md](AGENTS.md) — verification commands (`npm run verify`, smoke E2E).
2. [.cursor/rules/ehs-ims-conventions.mdc](.cursor/rules/ehs-ims-conventions.mdc).
3. This CONTEXT.md — stack, naming, boundaries, anti-patterns.
4. **Compliance- or retention-affecting changes:** [`.cursor/skills/corporate-compliance-data-governance/SKILL.md`](.cursor/skills/corporate-compliance-data-governance/SKILL.md) and [COMPLIANCE.md](COMPLIANCE.md); requestable rule [`.cursor/rules/compliance-data-governance.mdc`](.cursor/rules/compliance-data-governance.mdc).
5. Cursor skill **context-guardian** — [`.cursor/skills/context-guardian/SKILL.md`](.cursor/skills/context-guardian/SKILL.md): architecture and documentation-only (“Context Guardian”) sessions; use for Memory Bank structures, Mermaid system views, and governance prose without shipping app code.
6. **Enterprise packaging & diligence (keep aligned when boundaries change):** [docs/architecture-map.md](docs/architecture-map.md) (end-to-end map, integrations stub, retention/RBAC pointers), [docs/workflow-depth.md](docs/workflow-depth.md) (incident/CAPA transitions, `audit_log` scope), [docs/procurement-readiness.md](docs/procurement-readiness.md) (positioning, ROI template, pilot/moat narrative), [docs/approval-workflow.md](docs/approval-workflow.md) (CAPA approval gate).

## Tech stack (pin from package.json — bump only with coordinated churn)

| Layer | Package / runtime | Notes |
|------|-------------------|--------|
| Runtime | Node engines `>=22 <23` | Match CI/deploy images. |
| Framework | Next.js **16.2.4** | App Router — prefer RSC-first; `'use client'` only where hooks/browser APIs required. |
| UI | React **19.2.5**, React DOM **19.2.5** | Server Component default boundary. |
| Styling | Tailwind **^4**, PostCSS `@tailwindcss/postcss` **^4** | Token/theme in globals — avoid inline magic hex in new flows where tokens exist. |
| API | **tRPC** `@trpc/server` / `@trpc/client` / `@trpc/react-query` **11.17.x** | All domain mutations/queries typed end-to-end. |
| Serialization | superjson **2.2.x** | Configured both server init and HTTP link. |
| Data | Drizzle ORM **0.45.x**, drizzle-kit **0.31.x** | Schema in `src/server/db/schema.ts`; always generate migrations. |
| DB driver | `@neondatabase/serverless` **^1.x** | Serverless Postgres connectivity. |
| Auth | better-auth **1.6.x** | Sessions via existing routes — do not reshape session JWT/cookies without coordinated test updates. |
| Validation / env | zod **4.x**, `@t3-oss/env-nextjs` **^0.13** | Typed env boundaries in `src/lib/env.ts`. |
| Client cache | `@tanstack/react-query` **5.100.x** | Default staleTime in provider — invalidate explicitly on mutations. |
| Rate limits | `@upstash/ratelimit`, `@upstash/redis` **2.x / 1.x** | Sensitive **tRPC** paths via **`protectedMutation`**/`rateLimitOrThrow`; **`/api/contextsync/*`** shares the sliding window via **`rateLimitContextSyncResponse`** ([`src/server/ratelimit.ts`](src/server/ratelimit.ts)). |
| Config | `@vercel/config` **^0.1.x** (`vercel.ts`) | Prefer over duplicate `vercel.json`. |
| Test | Vitest **4.x**, Playwright **1.59.x**, jsdom **29.x**, `@vitejs/plugin-react` **6.x** | Unit + smoke E2E are merge gates. |
| Lint / types | ESLint **9.x**, eslint-config-next **16.2.4**, TypeScript **^5.x** | `tsc --noEmit` in verify. |

## Planned subsystems (scaffold — not full product)

Cross-reference [ROADMAP.md](ROADMAP.md). **OIDC JIT:** [`docs/OIDC_JIT_PROVISIONING.md`](docs/OIDC_JIT_PROVISIONING.md), [`src/server/services/oidcJitProvisioning.ts`](src/server/services/oidcJitProvisioning.ts), session hook in [`src/server/auth.ts`](src/server/auth.ts). **Job queue:** [`src/server/jobs/`](src/server/jobs/), [`docs/JOB_QUEUE.md`](docs/JOB_QUEUE.md). **Terraform remote state:** [`docs/terraform-remote-state.md`](docs/terraform-remote-state.md). **DSAR intake:** `data_subject_request` table, `compliance.dsar.*`, [`/dashboard/privacy-requests`](src/app/dashboard/privacy-requests/page.tsx). **OSHA agency export:** placeholder only — [`src/lib/regulatory/oshaAgencyExportScaffold.ts`](src/lib/regulatory/oshaAgencyExportScaffold.ts), `compliance.regulatoryOsha.agencyExportPlaceholder`. **Governed AI / intake assistants:** [`docs/ai-governed-intake.md`](docs/ai-governed-intake.md). **Offline field outbox:** [`docs/offline-field-outbox.md`](docs/offline-field-outbox.md), [`src/components/field-outbox-global-sync.tsx`](src/components/field-outbox-global-sync.tsx).

Use this section when navigating procedure paths or onboarding agents. **Always register** top-level routers in [`src/server/trpc/root.ts`](src/server/trpc/root.ts).

## API surface map

### tRPC top-level namespaces

Listed in **`root.ts`** registration order: `analytics`, `approval`, `organization`, `incident`, `inspection`, `permit`, `observation`, `capa`, `aspect`, `obligation`, `document`, `ehsEvidence`, `managementReview`, `planning`, `training`, `internalAudit`, `rag`, `context`, `contextSyncProtocol`, `consultation`, `emergency`, `environmentalMonitoring`, `program`, `externalParty`, `tasks`, `integration`, `aiDrafts`, `aiAssistant`, `importData`, `compliance`.

Flat top-level routers of note:

- **`analytics`** — [`src/server/trpc/routers/analytics.ts`](src/server/trpc/routers/analytics.ts): org-scoped KPI / safety dashboard aggregates (`protectedProcedure`; permission logic per procedure, may use helpers like `userHasPermission`).
- **`approval`** — [`src/server/trpc/routers/approval.ts`](src/server/trpc/routers/approval.ts): CAPA plan approval gate (`listOpenCapaRequests`, `listMyPendingSteps`, `listEscalations`, `submitCapaPlanApproval`, `decideRequest`); product rules in [docs/approval-workflow.md](docs/approval-workflow.md).
- **`ehsEvidence`** — [`src/server/trpc/routers/ehsEvidence.ts`](src/server/trpc/routers/ehsEvidence.ts): evidence attachments bound to IMS entities (e.g. incidents); mutations should write **`audit_log`** via existing patterns — align retention and uploads with [COMPLIANCE.md](COMPLIANCE.md) when touching governance.
- **`externalParty`** — [`src/server/trpc/routers/externalParty.ts`](src/server/trpc/routers/externalParty.ts): compliance credentials for `external_party` rows (`getParty`, credential CRUD); parties are created under **`program`** ([`program.ts`](src/server/trpc/routers/program.ts) `listExternalParties` / `createExternalParty`). Use **`listOrgCredentialsDueSoon`** for renewal horizon lists.
- **`inspection`** — [`src/server/trpc/routers/inspection.ts`](src/server/trpc/routers/inspection.ts): workplace inspections (scheduled → in_progress → completed | cancelled); permissions **`inspection:read`**, **`inspection:create`**, **`inspection:update`**.
- **`permit`** — [`src/server/trpc/routers/permit.ts`](src/server/trpc/routers/permit.ts): digital work permits (draft → submit → `pending_approval` → **`active`** via approval chain completion); **`work_permit:read`** / **`create`** / **`update`** / **`work_permit:approve`** on decisions.
- **`observation`** — [`src/server/trpc/routers/observation.ts`](src/server/trpc/routers/observation.ts): safety observations (`safety_observation`); **`safety_observation:read`**, **`create`**, **`update`**, optional link to CAPA.
- **`context`** — [`src/server/trpc/routers/context.ts`](src/server/trpc/routers/context.ts): ISO **context of the organization** (scopes, issues); uses **`context:read`** / **`context:write`**. **Not** the same as [**Context Sync REST**](#rest-context-sync-open-protocol-subset) below.
- **`contextSyncProtocol`** — [`src/server/trpc/routers/contextSyncProtocol.ts`](src/server/trpc/routers/contextSyncProtocol.ts): bind which users may assert **`X-Agent-Class`** (`agentClassClaimsList`, `agentClassClaimCreate`, `agentClassClaimDelete`); guarded by **`org:admin`** only; **`organization.context_sync_enabled`** must be **true** (see REST subsection).

### REST Context Sync (open protocol subset)

- **Purpose:** interoperable **`ctx://{organization_uuid}/{domain}/{path}`** artifacts for agents/IDE tooling — see [`src/app/api/contextsync/`](src/app/api/contextsync/).
- **Tenant opt-in:** `organization.context_sync_enabled` (**PostgreSQL**, Drizzle [`organization.contextSyncEnabled`](src/server/db/schema.ts)). When **false**, every **`/api/contextsync/*`** route returns **`403`** `reason: "context_sync_disabled"` and **`contextSyncProtocol`** raises **`FORBIDDEN`** before RBAC checks on grants; **`organization.updateContextSyncEnabled`** (**`org:admin`**) toggles the flag with **`audit_log`**. Existing deployments are **backfilled enabled** in migration [`0025_daily_victor_mancha.sql`](drizzle/migrations/0025_daily_victor_mancha.sql); **new** `organization` rows default **`false`** at the database unless callers pass **`true`** (CLI seeds use **`true`** for demo/CI convenience — [`scripts/lib/seed-shared.ts`](scripts/lib/seed-shared.ts)).
- **Auth:** Better Auth session; **`X-Actor-Id`** (or query `actor_id`) must equal **`human:{session.user.id}`**; **`X-Agent-Class`** is applied only when a matching **`context_sync_agent_class_claim`** row exists (managed via **`contextSyncProtocol`**).
- **IMS:** Synthetic **`ctx://…/ims/…`** URIs return **read-only** snapshots from Drizzle IMS tables—**writes** to those subjects stay on EHS consoles / tRPC; standalone blobs use **`context_sync_artifact`** with versioning + **`audit_log`** on mutations.
- **Grants:** Optional **`context_sync_grant`** globs (**default deny when rows exist for the resolved actor/agent class** — see [`authorize.ts`](src/server/services/contextSync/authorize.ts)).
- **Rate limiting:** Same Upstash sliding-window budget as **`protectedProcedure`** peers ([`rateLimitContextSyncResponse`](src/server/ratelimit.ts) from route handlers via [`gateContextSyncRateLimit`](src/app/api/contextsync/_lib/http.ts)).
- **Verification:** Integration coverage in [`tests/integration/contextsync/`](tests/integration/contextsync/) and tRPC protocol router tests; smoke anon gate [`tests/e2e/smoke/contextsync-rest-auth.spec.ts`](tests/e2e/smoke/contextsync-rest-auth.spec.ts).

### Nested routers

- **`planning`** — Implemented under [`src/server/trpc/routers/planning/index.ts`](src/server/trpc/routers/planning/index.ts) with **`hazard`**, **`risk`**, **`objective`**, **`kpi`**, **`operationalControl`**. Prefer new planning procedures as separate files inside `planning/` and wire them through that index rather than enlarging unrelated routers.
- **`compliance`** — [`src/server/trpc/routers/complianceRouter.ts`](src/server/trpc/routers/complianceRouter.ts) nests **`establishment`**, **`metrics`** (org TRI rate snapshots), **`regulatoryOsha`**, **`dataRetention`**, **`chemicalInventory`**, **`dsar`** (retention/OSHA/privacy intake aligns with [COMPLIANCE.md](COMPLIANCE.md) and [`corporate-compliance-data-governance` skill](.cursor/skills/corporate-compliance-data-governance/SKILL.md)).

### App Router API handlers

| Route | Purpose |
|-------|---------|
| [`src/app/api/trpc/[trpc]/route.ts`](src/app/api/trpc/[trpc]/route.ts) | tRPC HTTP adapter |
| [`src/app/api/auth/[...all]/route.ts`](src/app/api/auth/[...all]/route.ts) | better-auth |
| [`src/app/api/cron/reminders/route.ts`](src/app/api/cron/reminders/route.ts) | Scheduled reminders (`vercel.ts` cron) |
| [`src/app/api/cron/data-retention/route.ts`](src/app/api/cron/data-retention/route.ts) | Data retention cron (`vercel.ts` cron): incidents plus program records (`safety_observation`, `work_permit`) when `retain_until` set |
| [`src/app/api/cron/metrics/route.ts`](src/app/api/cron/metrics/route.ts) | Prometheus or JSON rollup of `cron_job_run` rows; `Authorization: Bearer <CRON_SECRET>` (pull/scrape for SLO dashboards — not scheduled in [`vercel.ts`](vercel.ts) `crons`) |
| [`src/app/api/contextsync/`](src/app/api/contextsync/) | Context Sync REST (session + `human:{user}` actor binding; rate-limited JSON — see [REST Context Sync](#rest-context-sync-open-protocol-subset)) |
| [`src/app/api/evidence-upload-stub/route.ts`](src/app/api/evidence-upload-stub/route.ts) | Evidence upload stub |
| [`src/proxy.ts`](src/proxy.ts) | Matcher gate for `/dashboard/*`, `/sign-in`, `/sign-up` via [`dashboard-auth-gate`](src/lib/dashboard-auth-gate.ts) — risky to change without updating [`tests/unit/middleware-auth-gate.test.ts`](tests/unit/middleware-auth-gate.test.ts) |

## Global state management rules

- **Server authoritative state**: PostgreSQL rows loaded through tRPC procedures only; never simulate DB updates in UI without successful mutation responses.
- **TanStack Query**: Primary cache for tRPC query results (`trpc.X.Y.useQuery` / `invalidate`). Prefer **narrow invalidation keys** (`utils.X.list.invalidate()` pattern) — avoid sweeping `invalidateQueries()` without targeting.
- **React context**: Use only for **session-scoping UI** already modeled (e.g. org selector in `src/components/org-context.tsx`). Do **not** add large global Redux-like stores — every new shared client state requires explicit rationale in PR description.
- **URL as state**: Prefer route params/searchParams for navigable drill-down (documents by id, filtered lists) rather than mirrored hidden global state.

## Error handling standards

- **tRPC**: Use `TRPCError` with appropriate `code` (`UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`, `NOT_FOUND`) from [`src/server/trpc/init.ts`](src/server/trpc/init.ts) patterns (`protectedProcedure`, `protectedMutation`).
- **User-facing surfacing**: Map errors at UI boundaries (`isTRPCClientError`-style guards or procedure `meta` conventions if introduced) — no raw stack traces on production pages.
- **Mutations**: On failure do not optimistically reconcile server state beyond existing patterns — refetch after success.
- **Rate limits**: **`rateLimitOrThrow`** wraps tRPC callers; **`/api/contextsync/*`** returns JSON **429** when over limit ([`rateLimitContextSyncResponse`](src/server/ratelimit.ts)) — callers must handle **`rate_limited`** consistently.
- **Cron / webhook routes**: Explicit auth guards and logging; failures should be observable (avoid silent swallow).

## Naming conventions

- **TypeScript interfaces / types / enums**: `PascalCase` for exported aliases; **do not** use `IIncident` prefixes — mirror existing domain names (`IncidentStatus`, router input types next to routers).
- **Functions & variables**: `camelCase`; **constants**: `SCREAMING_SNAKE_CASE` only for true immutable module-level literals.
- **Files**: Prefer **kebab-case** for shared React shells (`dashboard-shell.tsx`); mirror existing **camelCase** tRPC router files (`internalAudit.ts`, `environmentalMonitoring.ts`) rather than renaming wholesale.
- **tRPC routers**: **`routerName` + noun** namespaces in [`root.ts`](src/server/trpc/root.ts): `incident.*`, `capa.*`; procedures **`list`, `get`, `create`, `update`, `updateStatus`** where applicable. **`complianceRouter.ts`** aggregates compliance subdomains; **`planning/`** directory holds planning sub-routers (see [API surface map](#api-surface-map)).
- **Do not shadow `planning/`**: Never add **`src/server/trpc/routers/planning.ts`** alongside the **`planning/`** folder—many module resolvers prefer the `.ts` file and would bypass [`planning/index.ts`](src/server/trpc/routers/planning/index.ts).
- **Permissions**: Keys only from [`PERMISSIONS`](src/lib/rbac.ts); string literals duplicated in unrelated files are forbidden.
- **Tables / columns**: `snake_case` in Drizzle definitions following existing `schema.ts` patterns; enums aligned with Postgres enums defined there.
- **ISO terminology**: Separate **audit trail** (`audit_log`) from **ISO internal audit** domains (`internalAudit` router, `audit_finding`-style entities) — never mixed naming or UX strings.

## Security & compliance boundaries

- RBAC via `assertPermission` on **every new procedure** exposing regulated data — no “trusted internal” skips.
- **AI**: Structured outputs validated with **Zod** ([`src/lib/ai/structured.ts`](src/lib/ai/structured.ts), [`assistantStructuredParse.ts`](src/lib/ai/assistantStructuredParse.ts)); prompts/logs **PII-redacted** where applicable (`src/lib/pii`).
- **Local / edge SLM (`NEXT_PUBLIC_LOCAL_INTAKE_SLM`):** Flag-only boundary in [`src/lib/ai/localIntakeSlm.ts`](src/lib/ai/localIntakeSlm.ts). This repo does **not** ship an on-device model; any future client-side suggestion must remain non-authoritative until **server-side Zod validation and RBAC** persist regulated fields (see [AGENTS.md](AGENTS.md) AI guidance).
- Human-in-loop: Do not auto-close incidents, verify CAPAs, or lock regulatory classifications without explicit product approval.

## Verification before merge

```bash
npm run verify           # eslint + tsc + vitest
npm run verify:all       # add Playwright smoke
```

**Staging / business UAT:** [docs/qa/staging-uat-desk-to-field.md](docs/qa/staging-uat-desk-to-field.md).

Do not weaken smoke tests in `tests/e2e/smoke/` to green CI.

## Strict anti-patterns (do not argue — fix or escalate)

| Anti-pattern | Why |
|--------------|-----|
| **TypeScript-only DB fields** (“we’ll migrate later”) | Breaks authoritative DB and deploy drift. |
| **Direct provider `fetch`/SDK outside `gateway.ts`** | Unaudited spend, leaky keys, inconsistent parsing. |
| **Raw SQL/string queries in UI or random `src/lib`** | Bypasses Drizzle typing and central policy. |
| **Giant routers or 2000-line pages** | Prevents modular agent edits — split routers/modules. |
| **Bypassing RBAC for agents/cron/tools** | Creates silent privilege escalation surfaces. |
| **Free-form LLM strings → DB columns** without Zod | Compliance and type lies. |
| **New permissions without seed/migration paths** | Orgs silently lose RBAC coherence. |
| **Coupling unrelated domains in one procedure** | Hard to permission, test, and evolve. |

## Modular work guidance for coding agents

- Touch **one router file** plus **matching UI route** unless cross-cutting infra.
- **Dashboard UI:** Reuse shared primitives under [`src/components/dashboard/`](src/components/dashboard/) (KPI tiles, section chrome, empty states, page headers) before adding one-off layout on new dashboard pages.
- **Planning IMS**: Extend [`src/server/trpc/routers/planning/`](src/server/trpc/routers/planning/) (sub-router file + [`index.ts`](src/server/trpc/routers/planning/index.ts) registration) rather than stuffing unrelated domains into `planning`.
- Prefer **pure helpers** (`src/lib/workflow/*.ts`) for transition tables — keep procedures thin delegates.
- When adding migrations: **`schema.ts` → `npm run db:generate` → review SQL → commit** under `drizzle/migrations/`.
