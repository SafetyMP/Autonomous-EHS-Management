# ADR-S-005: Platform ops maturity and data/AI governance honesty

**Status:** Proposed (site delivery, revision 1)
**Date:** 2026-07-19
**Program:** `ehs` (corporate revision 1)
**Requirements:** R-011 (platform ops maturity), R-012 (data / AI governance and retention honesty)
**Related:** [JOB_QUEUE.md](../JOB_QUEUE.md), [cron-metrics-observability.md](../runbooks/cron-metrics-observability.md), [offline-field-outbox.md](../offline-field-outbox.md), [rag-redaction-runbook.md](../qa/rag-redaction-runbook.md), [retention-class-inventory.md](../qa/retention-class-inventory.md), [DSAR_PROCESS.md](../DSAR_PROCESS.md), [barrier-resolution-playbook.md](../barrier-resolution-playbook.md), [ADR-S-002](ADR-S-002-ranked-portfolio-barriers.md), [ADR-S-004](ADR-S-004-threat-model-demo-env.md)

**Not legal advice.** Ops runbooks and retention inventories describe technical controls; counsel owns jurisdiction maps, DPIA, and claim expansion.

## Context

Corporate handoff revision 1 requires honest platform and governance posture:

1. **R-011** — Cron scrape/alerts, pg-boss workers, and in-app binary evidence upload must **not** be assumed production-true. Document SLO parity for `reminders`, `data-retention`, and `integration-roster-reconcile` (matching `CRON_JOB_KEYS`) **or** explicitly record absence of production scrape digests. Record the pg-boss vs HTTP cron default. Ship a field-outbox ops checklist. Keep evidence upload non-claim until object-store is live.
2. **R-012** — RAG redaction on by default with `RAG_READ` / `AI_DRAFT_USE` / `rag:ingest` gates; retention classes split into cron-covered vs policy-only; DSAR remains intake + counsel process (no automated export/erasure claims).

## Decision

### 1. Cron SLO honesty (R-011)

[`docs/runbooks/cron-metrics-observability.md`](../runbooks/cron-metrics-observability.md) documents **template** SLOs and PromQL for all three `CRON_JOB_KEYS` labels. It states that **production-monitored** claims require scrape digests (collector config + alert rules applied in the target environment). Without those digests, the repo ships **example** scrape/alert artifacts only — not a production-true monitoring claim.

### 2. Job model decision (R-011 / D-004)

[`docs/JOB_QUEUE.md`](../JOB_QUEUE.md) records **HTTP cron as the default production job model**. `PG_BOSS_ENABLED` remains an **optional opt-in** that requires a long-lived worker Deployment and queue/failure alerts before any durable-queue completeness claim. Barrier **D-004** is marked `unblocked` with this ADR + JOB_QUEUE.md as the decision artifact.

### 3. Field outbox ops checklist (R-011 / D-010)

[`docs/offline-field-outbox.md`](../offline-field-outbox.md) adds an operator checklist covering enablement, failed-sync triage, and device-loss acknowledgment. Photos offline and multi-device reconciliation remain **non-goals** until D-010 policy exists (status stays `blocked` for those claims).

### 4. Evidence binary upload honesty (R-011 / D-009)

`POST /api/evidence-upload-stub` returns **501** and is not a production object-store path. In-app binary evidence upload claims remain blocked under **D-009** until vendor + DLP/encryption controls are live and registered via `ehsEvidence.register`.

### 5. RAG / AI governance (R-012)

[`docs/qa/rag-redaction-runbook.md`](../qa/rag-redaction-runbook.md) records that ingest/prompt redaction runs by default, permission gates, and that DPIA-complete claims require counsel. [`docs/ai-governed-intake.md`](../ai-governed-intake.md) cross-links the runbook; AI remains proposal-only.

### 6. Retention class inventory + DSAR (R-012)

[`docs/qa/retention-class-inventory.md`](../qa/retention-class-inventory.md) lists cron-covered vs policy-only `data_retention_record_class` values. [`docs/DSAR_PROCESS.md`](../DSAR_PROCESS.md) keeps the intake + counsel-only contract (no automated export/erasure).

### 7. Barrier notes for ops-stable IDs

Only **D-004, D-008, D-009, D-010, D-011, D-012** status/owner notes are updated in the barrier register (structure owned by ADR-S-002).

## Consequences

**Positive**

- Gate G-R-011 / G-R-012 evidence paths exist without implying turnkey production monitoring, workers, or binary upload.
- Operators have a single cron-metrics runbook aligned to `CRON_JOB_KEYS`.
- Retention and DSAR honesty is auditable without overselling automation.

**Negative / residual**

- Production scrape digests and monitoring owner (D-008) remain open.
- Object-store evidence (D-009), outbox photo/multi-device policy (D-010), and Context Sync provenance under hold (D-011) still block claim expansion.
- Counsel checklist owners for jurisdiction / subprocessor / dual-record OSHA remain outside this ADR’s engineering write set.

## Verification

```bash
./scripts/verify.sh
```

Document review checklist (manual): cron runbook names all three job keys; JOB_QUEUE.md states HTTP cron default; outbox checklist present; D-009 notes deny binary-upload claims; RAG runbook + retention inventory + DSAR banner language present.
