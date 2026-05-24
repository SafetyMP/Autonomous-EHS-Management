# Mutation auditability matrix (`writeAuditLog`)

Repo-grounded inventory mapping selected **high-impact** tRPC routers under [`src/server/trpc/routers/`](../../src/server/trpc/routers/) to use of the canonical helper **`writeAuditLog`** from [`src/server/services/audit`](../../src/server/services/audit.ts) (typically `import { writeAuditLog } from "@/server/services/audit"`).

This is **transactional** audit (`audit_log`), not the ISO **internal audit programme** (`internal_audit`)—see [architecture-map.md — Audit trail vs ISO internal audit](../architecture-map.md#5-audit-trail-vs-iso-internal-audit).

**Related:** automated risk × coverage traceability lives in [`risk-based-coverage-matrix.md`](./risk-based-coverage-matrix.md). **Read path:** `compliance.auditTrail.*` / `/dashboard/audit-trail` via [`auditTrailRouter.ts`](../../src/server/trpc/routers/auditTrailRouter.ts). Staging UAT: [`staging-uat-desk-to-field.md`](./staging-uat-desk-to-field.md).

---

## Disclaimer (residual risk)

Incomplete or uneven `audit_log` coverage is **residual risk** for governance and operational forensics. This inventory is a **static grep-derived snapshot**; it does **not** assert completeness for every branch, nested service, cron job, REST route (`src/app/api`), background worker, or integration path.

Remediation requires a **product-backed** list of which mutations and exports must be auditable. **Do not treat this document as a promise of legal or regulatory compliance.**

---

## Methodology

Run from the repository root.

1. **List router modules**

   ```bash
   rg --files -g '*.ts' src/server/trpc/routers
   ```

2. **`writeAuditLog` usage under routers**

   ```bash
   rg 'writeAuditLog' src/server/trpc/routers
   ```

   Optional stricter filter:

   ```bash
   rg 'writeAuditLog' src/server/trpc/routers --glob '*.ts'
   ```

3. **Mutation heuristic** (locate `.mutation(` chains)

   ```bash
   rg '\.mutation\(' src/server/trpc/routers
   ```

4. **Procedure names** were confirmed from router object keys and file reads—not guessed.

**Classification**

| Label | Meaning |
|-------|---------|
| **Y** | Every mutation either calls `writeAuditLog` in the router **or** in a **documented** callee under `src/server/services/**` invoked by that mutation (one-hop trace when the router file has no direct call). |
| **Partly** | At least one mutation lacks audit in-router **and** no audited callee was confirmed in this pass for that path. |
| **N** | Mutations exist; no `writeAuditLog` in-file and no callee noted here. |
| **N/A** | No mutations (queries only or composite router shell). |

**Expectation** ([ehs-ims-conventions](../../.cursor/rules/ehs-ims-conventions.mdc)): mutations that change regulated data should **`writeAuditLog`** where sibling procedures already do. Spot-check **`src/app/api`** and **`src/server/services`** when mutations delegate or bypass tRPC.

**Router vs. delegated service:** A successful mutation may emit **`writeAuditLog`** from the tRPC router **or** from exactly **one** delegated helper/service along its success path—either satisfies forensic traceability for this matrix. **Duplicate** audit rows for the same user-visible outcome remain an anti-pattern; prefer one authoritative log site per outcome. This inventory is grep- and discipline-oriented (reachable `writeAuditLog` / documented one-hop callee), not a mandate about stack placement.

---

## REST routes, cron jobs, and workers (outside tRPC routers)

Next.js **`src/app/api/**`** typically does **not** call `writeAuditLog` directly; durable writes usually delegate to services that instrument audits. Highlights for reviewer spot-checks:

| Entry | Auditing |
|-------|----------|
| **`POST /api/integration/inbound`** | **`persistTrainingCompletionEvent`** ([`trainingCompletionIngest.ts`](../../src/server/services/trainingCompletionIngest.ts)) emits `integration.ingest_training_completion`. Synchronous **`processHrisMembershipSyncInbound`** runs **`applyHrisMembershipSync`** ([`hrisMembershipSyncIngest.ts`](../../src/server/services/hrisMembershipSyncIngest.ts)) → `integration.hris_membership_sync`. **Queued HRIS (`202` when `PG_BOSS_ENABLED`):** audits fire when **`scripts/job-worker.ts`** completes the job, not at enqueue time. |
| **Context Sync REST** (artifacts, actors, grants, permissions where applicable) | [`contextSync/artifacts.ts`](../../src/server/services/contextSync/artifacts.ts) and related helpers call **`writeAuditLog`** for creates/updates/deletes surfaced over HTTP. |
| **`GET /api/cron/data-retention`** | Cron handler invokes **`runDataRetentionCron`** ([`dataRetention.ts`](../../src/server/services/dataRetention.ts)), which emits lifecycle audit rows (`data_lifecycle.*`) as implemented. |

**Repeatable grep sweep:** From repo root run **`npm run audit:matrix-greps`**, which executes [`scripts/audit-matrix-greps.sh`](../../scripts/audit-matrix-greps.sh). The script **prefers ripgrep** (`rg`) and **falls back** to `find` + `grep -E` when `rg` is not installed (same intent, slower). Extend the script when new high-risk API surfaces warrant routine checks.

---

## Core programme routers

### `incident.ts`

| Router file | Notable mutations | `writeAuditLog` | Gaps / notes | Priority |
|-------------|-------------------|-----------------|--------------|----------|
| [`incident.ts`](../../src/server/trpc/routers/incident.ts) | `create`, `updateStatus`, `update` | **Y** | Three mutations; three in-file `writeAuditLog` calls (`rg`). | P2 |

### `observation.ts`

| Router file | Notable mutations | `writeAuditLog` | Gaps / notes | Priority |
|-------------|-------------------|-----------------|--------------|----------|
| [`observation.ts`](../../src/server/trpc/routers/observation.ts) | `create`, `update`, `linkToCapa` | **Y** | Three mutations; three in-file audit writes. | P2 |

### `inspection.ts`

| Router file | Notable mutations | `writeAuditLog` | Gaps / notes | Priority |
|-------------|-------------------|-----------------|--------------|----------|
| [`inspection.ts`](../../src/server/trpc/routers/inspection.ts) | `create`, `update`, `updateStatus` | **Y** | Three mutations; three in-file audit writes. | P2 |

### `capa.ts`

| Router file | Notable mutations | `writeAuditLog` | Gaps / notes | Priority |
|-------------|-------------------|-----------------|--------------|----------|
| [`capa.ts`](../../src/server/trpc/routers/capa.ts) | `create`, `updateStatus`, `assignOwner` | **Y** | Includes `capa.create` on insert path. | P2 |

### `permit.ts` (work permits / PTW)

| Router file | Notable mutations | `writeAuditLog` | Gaps / notes | Priority |
|-------------|-------------------|-----------------|--------------|----------|
| [`permit.ts`](../../src/server/trpc/routers/permit.ts) | `create`, `update`, `setProgramRetention`, `submitForApproval`, `updateStatus` | **Y** | Five mutations; multiple in-file audit writes. | P2 |

### `environmentalRegulatoryPermit.ts`

| Router file | Notable mutations | `writeAuditLog` | Gaps / notes | Priority |
|-------------|-------------------|-----------------|--------------|----------|
| [`environmentalRegulatoryPermit.ts`](../../src/server/trpc/routers/environmentalRegulatoryPermit.ts) | `create`, `submitForApproval`, `withdrawSubmission`, `update`, `setProgramRetention` | **Y** | `submitForApproval` audited in-file (`environmental_regulatory_permit.submit_approval`). | P2 |

### `approval.ts`

| Router file | Notable mutations | `writeAuditLog` | Gaps / notes | Priority |
|-------------|-------------------|-----------------|--------------|----------|
| [`approval.ts`](../../src/server/trpc/routers/approval.ts) | `submitCapaPlanApproval`, `submitWorkPermitApproval`, `decideRequest` | **Y** | Submit flows call [`insertCapaApprovalSteps`](../../src/server/services/capaApprovalSteps.ts) / [`insertWorkPermitApprovalRequestTx`](../../src/server/services/workPermitApproval.ts) → [`insertSerialApprovalSteps`](../../src/server/services/capaApprovalSteps.ts), which **always** calls `writeAuditLog`. Decisions audited in-router. | P2 |

### `integration.ts`

| Router file | Notable mutations | `writeAuditLog` | Gaps / notes | Priority |
|-------------|-------------------|-----------------|--------------|----------|
| [`integration.ts`](../../src/server/trpc/routers/integration.ts) | `enqueueTestEvent`, `ingestTrainingCompletion`, `upsertConnectorMapping`, `reprocessFailedEvent` | **Y** | Four mutations; four `writeAuditLog` blocks in-file (`rg`). | P1 |

### `rag.ts`

| Router file | Notable mutations | `writeAuditLog` | Gaps / notes | Priority |
|-------------|-------------------|-----------------|--------------|----------|
| [`rag.ts`](../../src/server/trpc/routers/rag.ts) | `backfillEmbeddings`, `ingest`, `redactExistingSource` | **Y** | Reads (`listSources`, `embedQuery`, `search`) are queries only. | P1 |

### `organization.ts` (RBAC-sensitive / webhooks / Context Sync toggle)

| Router file | Notable mutations | `writeAuditLog` | Gaps / notes | Priority |
|-------------|-------------------|-----------------|--------------|----------|
| [`organization.ts`](../../src/server/trpc/routers/organization.ts) | `completeSetupStep`, `updateContextSyncEnabled`, `createOperationalWebhook`, `updateOperationalWebhook`, `deleteOperationalWebhook` | **Y** | Five mutations; five `writeAuditLog` call sites (`rg`). | P0–P1 |

### `planning/riskRouter.ts` (risk assessments roster)

| Router file | Notable mutations | `writeAuditLog` | Gaps / notes | Priority |
|-------------|-------------------|-----------------|--------------|----------|
| [`planning/riskRouter.ts`](../../src/server/trpc/routers/planning/riskRouter.ts) | `create`, `update`, `setProgramRetention` | **Y** | Three mutations; three in-file audit writes. | P2 |

### `program.ts` (EMS programme records)

| Router file | Notable mutations | `writeAuditLog` | Gaps / notes | Priority |
|-------------|-------------------|-----------------|--------------|----------|
| [`program.ts`](../../src/server/trpc/routers/program.ts) | `createExternalParty`, `createEmergencyScenario`, `createEmergencyDrill`, `createMOC`, `createCbAudit`, `createCertificate`, `createKpi`, `createMeasurement` | **Y** | Eight create mutations; each handler includes **`writeAuditLog`** inside its DB transaction (`rg` / file read). | P2 |

### `contextSyncProtocol.ts` (Context Sync agent-class claims)

| Router file | Notable mutations | `writeAuditLog` | Gaps / notes | Priority |
|-------------|-------------------|-----------------|--------------|----------|
| [`contextSyncProtocol.ts`](../../src/server/trpc/routers/contextSyncProtocol.ts) | `agentClassClaimCreate`, `agentClassClaimDelete` | **Y** | Two mutations; audits **in-router** after successful `createAgentClassClaim` / `deleteAgentClassClaimById` (`context_sync.agent_class_claim.create` / `.delete`). Service helpers do not double-log. | P0 |

### `aiAssistant.ts`

| Router file | Notable mutations | `writeAuditLog` | Gaps / notes | Priority |
|-------------|-------------------|-----------------|--------------|----------|
| [`aiAssistant.ts`](../../src/server/trpc/routers/aiAssistant.ts) | `proposeWithRagContext`, `proposeObservationIntakeDraft`, `proposeIncidentIntakeDraft`, `proposeInspectionIntakeDraft`, `proposePermitIntakeDraft`, `proposeCapaIntakeDraft` | **Y** | `proposeWithRagContext` audits in-router on **`final`** step success (`ai.assistant.propose`); tool-budget exhaustion throws without audit. Intake drafts delegate to **`runRagBackedIntakeDraft`** → [`ragIntakeDraftPipeline.ts`](../../src/server/services/ai/ragIntakeDraftPipeline.ts) (`writeAuditLog` on success with per-call `auditAction`; JSON parse failures → `ai.assistant.draft_parse_failed`). No duplicate router+pipeline logging on draft success. | P1 |

### `aiDrafts.ts`

| Router file | Notable mutations | `writeAuditLog` | Gaps / notes | Priority |
|-------------|-------------------|-----------------|--------------|----------|
| [`aiDrafts.ts`](../../src/server/trpc/routers/aiDrafts.ts) | `suggestAspectDraft`, `applyAspectDraft` | **Y** | `suggestAspectDraft` does not persist domain rows (audit optional). `applyAspectDraft` inserts `environmental_aspect` with **`ai_drafts.apply_aspect_draft`** in the same transaction as the insert (payload: org id, siteId, significance, aspect name — not full draft text blocks). | P1 |

---

## Compliance subtree (`complianceRouter` composition)

[`complianceRouter.ts`](../../src/server/trpc/routers/complianceRouter.ts) is a **composite** router (no leaf procedures).

| Child router | Mutations? | `writeAuditLog` | Notes |
|--------------|------------|-----------------|-------|
| [`auditTrailRouter.ts`](../../src/server/trpc/routers/auditTrailRouter.ts) | `exportCsv` implemented as a `.query` that returns CSV **and** writes `audit_log` | **Y** | Export emits `compliance.audit_trail.export_csv`. |
| [`dataRetentionRouter.ts`](../../src/server/trpc/routers/dataRetentionRouter.ts) | `upsertPolicy` | **Y** | |
| [`regulatoryOshaRouter.ts`](../../src/server/trpc/routers/regulatoryOshaRouter.ts) | `createPersonSubject`, `upsertInjuryIllnessRecord`, `exportInjuryIllnessSnapshot` | **Y** | |
| [`dsarRouter.ts`](../../src/server/trpc/routers/dsarRouter.ts) | DSAR mutations | **Y** | |
| [`establishmentRouter.ts`](../../src/server/trpc/routers/establishmentRouter.ts) | Establishment mutations | **Y** | |
| [`chemicalInventoryRouter.ts`](../../src/server/trpc/routers/chemicalInventoryRouter.ts) | Inventory mutations | **Y** | |
| [`workflowCatalogRouter.ts`](../../src/server/trpc/routers/workflowCatalogRouter.ts) | *(none)* | **N/A** | Read-only `get` query. |
| [`complianceMetricsRouter.ts`](../../src/server/trpc/routers/complianceMetricsRouter.ts) | `computeTrirSnapshot` | **Y** | Router calls `persistTrirSnapshot` then **`writeAuditLog`** in-router (`compliance_metrics.trir_snapshot_compute`, payload includes `snapshotId`, period bounds, `inputsHash`). | *(closed)* |

---

## Probable gaps (product backlog)

| Router | Mutations | Gap | Priority |
|--------|-----------|-----|----------|
| [`portcoIdentity.ts`](../../src/server/trpc/routers/portcoIdentity.ts) | `upsertScimGroupMapping`, `deleteScimGroupMapping`, `upsertOidcJitRule`, `deleteOidcJitRule` | No `writeAuditLog` (SCIM config + token rotate **are** audited) | P1 — PortCo diligence; documented in [portco-uat-signoff-record.md](./portco-uat-signoff-record.md) |

Re-run methodology greps after refactors; extend this table when new gaps are confirmed.

---

## Query-only routers (no mutation audit matrix row required)

Heuristic: no `.mutation(` in file or intentionally read-only.

- [`analytics.ts`](../../src/server/trpc/routers/analytics.ts)
- [`tasks.ts`](../../src/server/trpc/routers/tasks.ts)
- [`workflowCatalogRouter.ts`](../../src/server/trpc/routers/workflowCatalogRouter.ts)

---

## Appendix — Other grep-positive routers (abbreviated)

Additional router modules under `src/server/trpc/routers/` that **`rg writeAuditLog`** reports (extend per-feature as needed): `aspect.ts`, `consultation.ts`, `context.ts`, `document.ts`, `ehsEvidence.ts`, `emergency.ts`, `environmentalMonitoring.ts`, `externalParty.ts`, `importData.ts`, `internalAudit.ts`, `managementReview.ts`, `obligation.ts`, `planning/controlRouter.ts`, `planning/hazardRouter.ts`, `planning/kpiRouter.ts`, `planning/objectiveRouter.ts`, `training.ts`, and others merged into compliance subtree above. **`aiDrafts.ts`** is tabulated in **Core programme routers** (`applyAspectDraft` audits in-router).

---

## Snapshot counts (this pass)

| Metric | Value |
|--------|-------|
| Router modules in **Core programme routers** section | **15** (includes `aiDrafts.ts`) |
| Compliance subtree child routers tabulated | **8** leaf routers (+ composite parent) |
| **Probable gap** clusters flagged | **0** |

Re-run the methodology greps after refactors; delegated logic may move audit into services without updating this doc.
