# Ranked maturation portfolio (P0–P5)

**Authority:** Corporate handoff rev 1 (R-003, R-013, R-014) + [ADR-S-002](../adr/ADR-S-002-ranked-portfolio-barriers.md).  
**Tier names:** Consume [module-maturity.md](../module-maturity.md) / [ADR-S-001](../adr/ADR-S-001-honesty-promotion.md) verbatim — do not redefine Core / Connected / Plumbing / Gated.

## LOC baselines (handoff capture)

Measured in worktree `ADR-S-002` on **2026-07-19** with:

```bash
wc -l src/server/db/schema.ts src/server/trpc/routers/incident.ts src/server/trpc/routers/capa.ts
```

| Path | LOC |
|------|-----|
| `src/server/db/schema.ts` | 3806 |
| `src/server/trpc/routers/incident.ts` | 665 |
| `src/server/trpc/routers/capa.ts` | 723 |

Re-measure with the same `wc -l` command before starting P1/P2 execution work. Treat large deltas as a signal to re-baseline exit criteria, not as silent scope growth.

## Kill criteria

Plumbing regulatory themes (OSHA agency e-file, full DSAR export/erasure, Tier2 Submit / EPA filing as Core) **must not** outrank P0/P1 unless [barrier-resolution-playbook.md](../barrier-resolution-playbook.md) records a counsel or user override artifact ID for that item (see D-001, D-002, D-005).

Horizon ranking (planning only):

| Horizon | Focus |
|---------|--------|
| **A** | Harden Core evidence + anti-oversell (P0, honesty gates) |
| **B** | Field / supervisory partnership items (P3 + R-013 epics) |
| **C** | PortCo identity under counsel (D-003; iPaaS path) |

## Ranked themes

| Rank | Theme | Owner | Exit criteria |
|------|--------|-------|---------------|
| **P0** | Audit coverage on Tier-1 mutations + GTM honesty | staff-eng-quality | Core spine must-audit list closed or explicitly gapped; CI `audit:matrix-greps` green; claim-lint + module-maturity check green; no Plumbing sold as Core |
| **P1** | Schema modularization | staff-eng-platform | Split `schema.ts` by domain; re-export stable index; no file ≫~800 LOC without waiver; `db:generate` + migrate green |
| **P2** | Router / service thinning | staff-eng-platform | Split fat `incident` / `capa` routers (≤~300 LOC leaf files); multi-step ops in `services/`; `AppRouter` paths stable; verify green |
| **P3** | Field outbox depth | staff-eng-product | IndexedDB draft recovery/conflict surfacing; RBAC-preserving replay; ops checklist for failed sync / device-loss ([offline-field-outbox.md](../offline-field-outbox.md)); claim expansion gated by D-010 |
| **P4** | Evidence binary upload | staff-eng-platform | Object-store signed upload + virus/size/type policy + retention/hold alignment; stub deprecated or gated; no in-app binary claim until live (D-009) |
| **P5** | Durable job queue (ops decision) | platform-lead | If `PG_BOSS_ENABLED`: worker Deployment, queue/DLQ alerts, drain-or-disable runbook; else HTTP cron remains default with documented decision (D-004) |

**Secondary (after Core split):** environmentalRegulatoryPermit, obligation, organization, program, approval modularization.  
**Deprioritize until counsel/external ownership:** OSHA agency e-file, full DSAR export/erasure, Tier2 Submit, Cal/OSHA heat engine, LOTO, OH clinic depth, native Workday OAuth as Core.

## Partnership backlog epic contracts (R-013)

Each epic extends the deterministic spine with human-gated approvals. AI paths remain **propose → human-ack → persist** — the model may draft; a human must acknowledge before any SoR write; assistants must not auto-close investigations, auto-verify CAPA, or silently commit regulatory classification.

| Epic | SoR persistence path | RBAC keys (examples) | audit_log / exception | Smoke / UAT hook |
|------|----------------------|----------------------|------------------------|------------------|
| Offline / outbox capture | Same tRPC mutations as online (`incident.create`, observation/inspection/permit creates) after outbox flush | Existing create permissions on each procedure; no bypass | Domain create audits where already instrumented; gaps tracked under P0 matrix | `@smoke` intake + outbox retry UX; [offline-field-outbox.md](../offline-field-outbox.md) ops checklist |
| Assistive drafting (incident + observation) | Human commits via standard create/update mutations after draft ack | `AI_DRAFT_USE` / related draft permissions; domain create keys | `ai.assistant.*` on propose; domain audits on persist after human-ack | Unit non-transition proofs (ADR-S-003); intake UI “Suggest wording” never writes SoR alone |
| Observation follow-up SLA ladder | Observation / task / CAPA linkage tables via permissioned tRPC | observation + CAPA + task permissions | Status/assignment mutations where instrumented; exception if read-only ladder view | Staging UAT desk-to-field; future `@smoke` SLA path |
| Leading-indicator analytics | Read aggregates from Postgres IMS tables via `analytics.*` | analytics read permissions | **Exception:** read-only aggregates — N/A for `audit_log`; mutations elsewhere keep audits | Dashboard KPI spot-check / UAT; labels must stay non-statutory |
| AI / RAG resilience | RAG corpus rows + draft proposals only; never SoR until human persist | `RAG_READ`, `rag:ingest`, `AI_DRAFT_USE` | Assistant failure + ingest audits where present; no DPIA-complete claim (counsel) | Unit/integration AI failure paths; propose→ack→persist invariant tests |
| Smoke coverage extension | N/A (test surface) | E2E seed roles | **Exception:** test harness — N/A | CAPA→verified, Approvals decide, audit-trail (ADR-S-003); PTW remains Connected until smoke exists |

## PortCo Tier-1 wedge

Pilot limited to **Core + selected Connected** per [portco-tier1-pilot-scope.md](../qa/portco-tier1-pilot-scope.md). Tier-4 agency gaps (Workday native OAuth, OSHA e-file, OH clinic depth, no-code designer, native mobile) stay out of scope with buyer-facing statements in procurement §12. See also [portco-module-value-assessment.md](../portco-module-value-assessment.md) and [procurement-portco-integration-budget.md](../procurement-portco-integration-budget.md).

## Related decisions (R-014)

Claim-expansion blockers D-001..D-012 live in [barrier-resolution-playbook.md](../barrier-resolution-playbook.md). Portfolio themes P4/P5 and field-evidence claims explicitly depend on D-009 / D-004 / D-010 remaining honest until unblocked.
