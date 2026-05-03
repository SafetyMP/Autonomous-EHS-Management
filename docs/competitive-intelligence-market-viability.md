# Competitive intelligence: market viability (snapshot)

Enterprise and technical positioning relative to major EHS / EHSQ suites—grounded in this repository. **Not legal or investment advice.** For buyer-facing methodology see [procurement-readiness.md](./procurement-readiness.md).

---

## **[Market Position: CHALLENGER — Project analysis]**

Relative to named enterprise suites ([Intelex](https://www.gartner.com/reviews/market/ehs-software), [Cority CorityOne](https://www.cority.com/corityone/), [Wolters Kluwer Enablon](https://www.wolterskluwer.com/en/news/wolters-kluwer-enablon-recognized-as-a-2026-environment-energy-leader-awards-winner)), this project still lacks multi-year implementation teams, deep occupational health modules, and decades of reference customers—but **recent engineering work strengthens the “credible pilot / self-hostable IMS” story**: operational observability for automation, broader workflow coverage in-schema, field capture resilience, **governed agent-read interoperability** (Context Sync REST), **buyer-visible transactional audit surfacing**, and CI-backed proof of core flows. Revenue share remains with incumbents; **architectural differentiation and diligence readiness moved up a tier**.

---

## **The Core Differentiator**

- **System-of-record IMS with explicit AI boundary** — PostgreSQL + Drizzle authority, tRPC + RBAC, proposal-only assistant patterns; positioning is “autonomous compliance operations,” not chat-first ([CONTEXT.md](../CONTEXT.md), [procurement-readiness.md](./procurement-readiness.md), [ai-governed-intake.md](./ai-governed-intake.md)).
- **Governed agent interoperability (Context Sync REST)** — Tenant opt-in (`organization.context_sync_enabled`), session-bound actors, optional scoped grants and `X-Agent-Class` claims ([`contextSyncProtocol`](../src/server/trpc/routers/contextSyncProtocol.ts)), rate limits ([`ratelimit.ts`](../src/server/ratelimit.ts)), optional **per-org daily read quota** and **provenance response caps** ([`dailyReadQuota.ts`](../src/server/services/contextSync/dailyReadQuota.ts), [`env.ts`](../src/lib/env.ts) — `CONTEXT_SYNC_ORG_DAILY_READ_LIMIT`, `CONTEXT_SYNC_PROVENANCE_MAX_LIMIT`), and read-only IMS-shaped snapshots via [`/api/contextsync/*`](../src/app/api/contextsync/)—supports IDE/agent tooling without authorizing shadow writes; provenance/runbooks in [context-sync-provenance.md](./runbooks/context-sync-provenance.md) and [architecture-map.md](./architecture-map.md).
- **Buyer-visible transactional audit trail** — `audit_log` surfaced for diligence beyond ISO internal-audit programme entities—**`compliance.auditTrail.*`** tRPC ([`auditTrailRouter.ts`](../src/server/trpc/routers/auditTrailRouter.ts)) and [`/dashboard/audit-trail`](../src/app/dashboard/audit-trail/page.tsx); scope and boundaries in [architecture-map.md](./architecture-map.md) §5.
- **Honest, migration-backed domain breadth** — Single schema spans incidents, CAPA, inspections, work permits, environmental regulatory permits, risk assessments, observations with follow-up/escalation hooks—documented in [architecture-map.md](./architecture-map.md) with explicit gaps (e.g. OSHA agency filing placeholder) so buyers get **defensible scoping** vs overselling.
- **Deployable automation with measurable health** — `cron_job_run` persistence and `GET /api/cron/metrics` (Prometheus/JSON) plus example K8s alerting artifacts improve “how do we know batch jobs work?” in security/ops reviews ([ROADMAP.md](../ROADMAP.md), [architecture-map.md](./architecture-map.md), [runbooks/cron-metrics-observability.md](./runbooks/cron-metrics-observability.md)).
- **Field-oriented capture path** — IndexedDB outbox with RBAC-preserving replay across multiple intake mutations, retry UX, viewport/safe-area work, and intake image handling—supports the **frontline adoption** angle competitors market (e.g. mobile-first vendors) without claiming full offline parity ([offline-field-outbox.md](./offline-field-outbox.md), [ROADMAP.md](../ROADMAP.md) partnership section).
- **Integration warehouse handoff (operator-owned)** — tRPC **`integration.exportEventsWarehouseSlice`** (NDJSON slice of `integration_event`, permission `integration:read`, `audit_log` on export)—see [architecture-map.md § Integrations](./architecture-map.md#9-integrations-map).

---

## **Top Competitor Threats**

| Competitor | Threat level | Advantage vs this repo |
|------------|--------------|-------------------------|
| **Intelex / Ideagen-style EHSQ** | **High** | Modular app library, mature RCA/CAPA templates, enterprise change-management muscle, Gartner-style social proof; beats this repo on **configurable workflow depth and services-led rollout** (buyer summaries such as [EHS software comparisons](https://whytrace.com/en/blog/E34_ehs-software-comparison)). |
| **Cority / VelocityEHS-class suites** | **High** | Strong occupational health, chemical/specialty risk, and ESG adjacency; incumbent **integration ecosystems and compliance content** that mid-market RFPs treat as default. |
| **SafetyCulture (iAuditor) / mobile-first inspection leaders** | **Medium–High** | Faster time-to-field for **inspections and frontline forms** and brand recognition for adoption; this repo’s outbox + dashboard depth help **narrow** but do not yet match mass-market mobile distribution. |

---

## **The Feature Gap**

**Still critical (table stakes vs enterprise suites)**

- **Deep RCA and investigation methodology** — Fishbone, gated 5 Whys, TapRooT-class tooling and guided investigation UX are **market-expected** at enterprise tier; the repo centers on lifecycle + evidence, not specialized RCA product ([ROADMAP.md](../ROADMAP.md), [architecture-map.md](./architecture-map.md)).
- **Agency-formatted regulatory filing** — OSHA agency export remains **placeholder**; blocks “replace legacy for submissions” narratives until counsel-defined scope ships ([ROADMAP.md](../ROADMAP.md) barriers table, [COMPLIANCE.md](../COMPLIANCE.md)).
- **Workflow configurability** — Incumbents sell **no-code/low-code process design**; this repo encodes transitions in code ([`src/lib/workflow/`](../src/lib/workflow/))—good for auditability, weaker for “make it match our 40-year procedure” RFPs without engineering.

**Partially addressed — gap narrows; buyer ask shifts**

- **Connector depth** — Inbound idempotency, optional **async HRIS** processing when [`PG_BOSS_ENABLED`](./JOB_QUEUE.md) (`202` + worker job), [`integration` router](../src/server/trpc/routers/integration.ts), and **persisted per-tenant mappings** (`integration.listConnectorMappings` / `integration.upsertConnectorMapping`, [integration-connector-mapping.md](./integration-connector-mapping.md)) improve operator runbooks vs “events only.” **Remaining gap:** productized **connector catalog**, preset schemas, and **admin mapping UI** for non-technical users vs suite vendors’ partner catalogs ([architecture-map.md](./architecture-map.md) §9).
- **Notifications and frontline comms** — **Operational outbound webhooks** ship for observation follow-up escalations, **overdue approval-step escalations**, integration `processing_failed`, and **`program.credential_batch_expired`** when the reminders cron marks contractor credentials expired ([operational-webhooks.md](./operational-webhooks.md), [architecture-map.md](./architecture-map.md) §9). **Remaining gap:** broader **event coverage** (e.g. obligation review due-dates without noisy repeats), first-class **email/Teams** adapters, native mobile apps, and positioning webhooks as a **supported product surface** in RFPs—not only internal plumbing.
- **Field / offline capture** — Outbox replay covers a **broader** tRPC roster (permits, environmental permits, risk create, etc.; [architecture-map.md](./architecture-map.md) §12). **Remaining gap:** **conflict surfacing**, **draft recovery**, and substantive degraded-mode behavior ([ROADMAP.md](../ROADMAP.md) partnership backlog).

**New or heightened gaps (surfaces that create new diligence questions)**

- **Context Sync governance at scale** — Tenant opt-in, grants, rate limits, and **optional org-level read quotas / provenance size caps** exist ([CONTEXT.md](../CONTEXT.md), [`dailyReadQuota.ts`](../src/server/services/contextSync/dailyReadQuota.ts), [runbooks/context-sync-provenance.md](./runbooks/context-sync-provenance.md)); cron scrape can expose a related **config gauge** (see [runbooks/cron-metrics-observability.md](./runbooks/cron-metrics-observability.md)). **Remaining diligence gaps:** provenance **volume and retention** (no bundled TTL purge—runbook backlog), buyer-facing **SLO narratives**, and **dedicated** Context Sync traffic metrics beyond shared cron instrumentation.
- **Transactional audit trail as product** — **`compliance.auditTrail.*`**, **[`/dashboard/audit-trail`](../src/app/dashboard/audit-trail/page.tsx)** surface `audit_log`, with **filtered CSV export** (`exportCsv`, `audit_trail:read`) logged as `compliance.audit_trail.export_csv`. **Possible gap:** retention posture for `audit_log`, and an explicit **permission matrix** for sensitive `entity_type` slices if not uniformly gated.
- **Assistive AI resilience** — Incident and observation **proposal-only** drafting expanded the assistant footprint ([ROADMAP.md](../ROADMAP.md)). **Gap:** **timeouts, structured-output repair, visible failure UX, and telemetry** become trust blockers if assistant calls flake under load ([ROADMAP.md](../ROADMAP.md) partnership § AI/RAG resilience).

---

## **The Attack Vector (Engineering Roadmap)**

1. **Productize integration + warehouse handoff** — Harden [`integration` router](../src/server/trpc/routers/integration.ts), [`POST /api/integration/inbound`](../src/app/api/integration/inbound/route.ts), and event contracts; ship **audited, permission-gated exports** (`integration.exportEventsWarehouseSlice`) and extend **idempotent tenant-scoped connectors** (LMS/HRIS first) with **`audit_log`** on material changes. **Business justification:** Wins “Integrate” phase on [procurement-readiness.md](./procurement-readiness.md) and reduces **rip-and-replace fear** vs suite vendors.

2. **Close the “leading indicators” loop in UI + exports** — Extend [`analytics` router](../src/server/trpc/routers/analytics.ts) leading indicators with **CSV download** for Ops reviews (see [Safety metrics](../src/app/dashboard/analytics/page.tsx) and [`leadingIndicatorsCsv`](../src/lib/analytics/leadingIndicatorsCsv.ts))—not LLM summaries. **Business justification:** Speaks supervisor actionability ([ROADMAP.md](../ROADMAP.md) partnership backlog) and competes with **dashboard-heavy suites** without inventing authoritative AI.

3. **Field reliability as a wedge** — Complete conflict surfacing, draft recovery, and expanded offline procedures per [offline-field-outbox.md](./offline-field-outbox.md); pair with smoke tests for **degraded connectivity** (e.g. global [OfflineBanner](../src/components/offline-banner.tsx) + outbox retry UX). **Business justification:** Improves **pilot conversion** against mobile-first competitors by proving **degraded-mode behavior is visible and recoverable**.

4. **Operational webhooks as a first-class integration wedge** — **Shipped:** `approval.step_escalated`, observation follow-up and integration-failure events, and **`program.credential_batch_expired`** (see [operational-webhooks.md](./operational-webhooks.md), [`eventTypes.ts`](../src/lib/operationalWebhook/eventTypes.ts), reminders [`route.ts`](../src/app/api/cron/reminders/route.ts)). **Next:** broaden **event types** (e.g. permit expiry) while keeping **signed** dispatch and avoiding duplicate-noise cron patterns ([`operationalWebhookDispatch.ts`](../src/server/services/operationalWebhookDispatch.ts)). **Business justification:** Meets **SIEM/Teams/webhook** buyers without claiming a full email product—narrows the notifications gap vs suites.

5. **Context Sync “enterprise hardening” pack** — **Partially shipped:** optional **org daily read limit** and **provenance max** per request/env; diligence notes in [architecture-map.md](./architecture-map.md) and [context-sync-provenance.md](./runbooks/context-sync-provenance.md); optional **gauge** on cron metrics scrape for configured limit. **Still open:** provenance **TTL/prune** automation, explicit buyer **SLO** appendix, and richer **traffic** observability than cron rollups alone. **Business justification:** Makes a **novel differentiator defensible** under security review and avoids procurement “shadow exfil” narratives.

6. **Durable async default for integration bursts** — **Partially shipped:** when `PG_BOSS_ENABLED=true`, HRIS [`POST /api/integration/inbound`](../src/app/api/integration/inbound/route.ts) may return **`202`** and enqueue **`integration.inboundHris`** for [`scripts/job-worker.ts`](../scripts/job-worker.ts) (see [JOB_QUEUE.md](./JOB_QUEUE.md)); idempotent replay cache is populated after worker completion. **Still recommended:** operate a long-lived worker in production, extend observable run metadata, and treat pg-boss as the **default** for other heavy fan-out paths as they appear. **Business justification:** High-volume tenants expect **at-least-once** async; cron-only stories lag incumbent reliability bar.

7. **Assistant resilience bundle** — Centralize timeout/repair in [`assistantStructuredParse.ts`](../src/lib/ai/assistantStructuredParse.ts) / gateway paths; user-visible failure on intake pages; structured log correlation. **Business justification:** More AI affordances without **poisoning** the non-authoritative AI positioning when models or networks fail.

8. **Connector mapping admin UX** — Minimal mapping/validation UI on [`/dashboard/integrations`](../src/app/dashboard/integrations/page.tsx) atop [`integration`](../src/server/trpc/routers/integration.ts) + [integration-connector-mapping.md](./integration-connector-mapping.md). **Business justification:** Moves HRIS/LMS wiring from **engineering-only** to **pilot self-serve**, improving time-to-value vs suite catalogs.

---

## **Signals to monitor**

- Competitor announcements on **AI-governed workflows** vs “AI completes the record”—moat stays crisp if [ai-governed-intake.md](./ai-governed-intake.md) stays aligned with shipped behavior.
- Buyer RFP language on **agent, MCP, or tool access to the system of record**—Context Sync stays a **differentiator** when positioned as **governed read/sync** (tenant kill switch, grants, rate limits, optional **read quotas and response caps** via [`env.ts`](../src/lib/env.ts)), not ungoverned exfil or shadow write paths; align messaging with [CONTEXT.md](../CONTEXT.md) REST Context Sync section and [cursor-tool-connections-deployment.md](./cursor-tool-connections-deployment.md) (customer vs internal tooling).
- Buyer RFP emphasis on **SLO/monitoring for background jobs**—scrapeable cron metrics exist ([`src/app/api/cron/metrics/route.ts`](../src/app/api/cron/metrics/route.ts)); watch for asks for SIEM/dashboard screenshots in pilots.
- **Mobile inspection parity** benchmarks (SafetyCulture et al.) on speed of capture vs **outbox + web shell** trajectory.
