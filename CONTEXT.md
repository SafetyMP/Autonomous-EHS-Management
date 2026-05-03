## Project identity

**Autonomous EHS Management System** — Next.js IMS-style application with ISO-aligned domains (incidents, CAPA, documents, audits, obligations, planning, training, RAG-assisted context). PostgreSQL via Drizzle is the **single system of record** for regulated state; client and LLM outputs are never authoritative until validated and persisted through approved procedures.

## Mandatory reading order (before any PR)

1. [AGENTS.md](AGENTS.md) — verification commands (`npm run verify`, smoke E2E).
2. [.cursor/rules/ehs-ims-conventions.mdc](.cursor/rules/ehs-ims-conventions.mdc).
3. This CONTEXT.md — stack, naming, boundaries, anti-patterns.
4. **Compliance- or retention-affecting changes:** [`.cursor/skills/corporate-compliance-data-governance/SKILL.md`](.cursor/skills/corporate-compliance-data-governance/SKILL.md) and [COMPLIANCE.md](COMPLIANCE.md); requestable rule [`.cursor/rules/compliance-data-governance.mdc`](.cursor/rules/compliance-data-governance.mdc).
5. Cursor skill **context-guardian** — [`.cursor/skills/context-guardian/SKILL.md`](.cursor/skills/context-guardian/SKILL.md): architecture and documentation-only (“Context Guardian”) sessions; use for Memory Bank structures, Mermaid system views, and governance prose without shipping app code.

## Tech stack (pin from package.json — bump only with coordinated churn)

| Layer | Package / runtime | Notes |
|------|-------------------|--------|
| Runtime | Node engines `>=22 <23` | Match CI/deploy images. |
| Framework | Next.js **16.2.4** | App Router — prefer RSC-first; `'use client'` only where hooks/browser APIs required. |
| UI | React **19.2.4**, React DOM **19.2.4** | Server Component default boundary. |
| Styling | Tailwind **^4**, PostCSS `@tailwindcss/postcss` **^4** | Token/theme in globals — avoid inline magic hex in new flows where tokens exist. |
| API | **tRPC** `@trpc/server` / `@trpc/client` / `@trpc/react-query` **11.17.x** | All domain mutations/queries typed end-to-end. |
| Serialization | superjson **2.2.x** | Configured both server init and HTTP link. |
| Data | Drizzle ORM **0.45.x**, drizzle-kit **0.31.x** | Schema in `src/server/db/schema.ts`; always generate migrations. |
| DB driver | `@neondatabase/serverless` **^1.x** | Serverless Postgres connectivity. |
| Auth | better-auth **1.6.x** | Sessions via existing routes — do not reshape session JWT/cookies without coordinated test updates. |
| Validation / env | zod **4.x**, `@t3-oss/env-nextjs` **^0.13** | Typed env boundaries in `src/lib/env.ts`. |
| Client cache | `@tanstack/react-query` **5.100.x** | Default staleTime in provider — invalidate explicitly on mutations. |
| Rate limits | `@upstash/ratelimit`, `@upstash/redis` **2.x / 1.x** | Mandatory for bounded AI / sensitive mutations via `protectedMutation`. |
| Config | `@vercel/config` **^0.1.x** (`vercel.ts`) | Prefer over duplicate `vercel.json`. |
| Test | Vitest **4.x**, Playwright **1.59.x**, jsdom **29.x**, `@vitejs/plugin-react` **6.x** | Unit + smoke E2E are merge gates. |
| Lint / types | ESLint **9.x**, eslint-config-next **16.2.4**, TypeScript **^5.x** | `tsc --noEmit` in verify. |

## API surface map

Use this section when navigating procedure paths or onboarding agents. **Always register** top-level routers in [`src/server/trpc/root.ts`](src/server/trpc/root.ts).

### tRPC top-level namespaces

Listed in **`root.ts`** registration order: `analytics`, `organization`, `incident`, `capa`, `aspect`, `obligation`, `document`, `ehsEvidence`, `managementReview`, `planning`, `training`, `internalAudit`, `rag`, `context`, `consultation`, `emergency`, `environmentalMonitoring`, `program`, `tasks`, `integration`, `aiDrafts`, `aiAssistant`, `importData`, `compliance`.

Flat top-level routers of note:

- **`analytics`** — [`src/server/trpc/routers/analytics.ts`](src/server/trpc/routers/analytics.ts): org-scoped KPI / safety dashboard aggregates (`protectedProcedure`; permission logic per procedure, may use helpers like `userHasPermission`).
- **`ehsEvidence`** — [`src/server/trpc/routers/ehsEvidence.ts`](src/server/trpc/routers/ehsEvidence.ts): evidence attachments bound to IMS entities (e.g. incidents); mutations should write **`audit_log`** via existing patterns — align retention and uploads with [COMPLIANCE.md](COMPLIANCE.md) when touching governance.

### Nested routers

- **`planning`** — Implemented under [`src/server/trpc/routers/planning/index.ts`](src/server/trpc/routers/planning/index.ts) with **`hazard`**, **`risk`**, **`objective`**, **`kpi`**, **`operationalControl`**. Prefer new planning procedures as separate files inside `planning/` and wire them through that index rather than enlarging unrelated routers.
- **`compliance`** — [`src/server/trpc/routers/complianceRouter.ts`](src/server/trpc/routers/complianceRouter.ts) nests **`establishment`**, **`regulatoryOsha`**, **`dataRetention`**, **`chemicalInventory`** (retention/OSHA/evidence-heavy work aligns with [COMPLIANCE.md](COMPLIANCE.md) and [`corporate-compliance-data-governance` skill](.cursor/skills/corporate-compliance-data-governance/SKILL.md)).

### App Router API handlers

| Route | Purpose |
|-------|---------|
| [`src/app/api/trpc/[trpc]/route.ts`](src/app/api/trpc/[trpc]/route.ts) | tRPC HTTP adapter |
| [`src/app/api/auth/[...all]/route.ts`](src/app/api/auth/[...all]/route.ts) | better-auth |
| [`src/app/api/cron/reminders/route.ts`](src/app/api/cron/reminders/route.ts) | Scheduled reminders (`vercel.ts` cron) |
| [`src/app/api/cron/data-retention/route.ts`](src/app/api/cron/data-retention/route.ts) | Data retention cron (`vercel.ts` cron) |
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
- **Rate limits**: `rateLimitOrThrow` wraps certain paths — callers must anticipate `TOO_MANY_REQUESTS`-like behavior consistently (document if adding new surfaced messages).
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
- **AI**: Structured outputs validated with **Zod** (`src/lib/ai/structured.ts` patterns); prompts/logs **PII-redacted** where applicable (`src/lib/pii`).
- Human-in-loop: Do not auto-close incidents, verify CAPAs, or lock regulatory classifications without explicit product approval.

## Verification before merge

```bash
npm run verify           # eslint + tsc + vitest
npm run verify:all       # add Playwright smoke
```

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
- **Planning IMS**: Extend [`src/server/trpc/routers/planning/`](src/server/trpc/routers/planning/) (sub-router file + [`index.ts`](src/server/trpc/routers/planning/index.ts) registration) rather than stuffing unrelated domains into `planning`.
- Prefer **pure helpers** (`src/lib/workflow/*.ts`) for transition tables — keep procedures thin delegates.
- When adding migrations: **`schema.ts` → `npm run db:generate` → review SQL → commit** under `drizzle/migrations/`.
