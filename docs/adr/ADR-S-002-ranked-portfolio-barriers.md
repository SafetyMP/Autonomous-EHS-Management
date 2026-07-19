# ADR-S-002: Ranked portfolio, partnership epics, and barrier decision register

**Status:** Proposed (site delivery, revision 1)
**Date:** 2026-07-19
**Program:** `ehs` (corporate revision 1)
**Requirements:** R-003 (ranked refactor portfolio), R-013 (partnership backlog contracts), R-014 (unresolved decisions register)
**Related:** [ADR-S-001 Honesty & promotion](ADR-S-001-honesty-promotion.md), [ranked-portfolio.md](../roadmap/ranked-portfolio.md), [barrier-resolution-playbook.md](../barrier-resolution-playbook.md)

**Not legal advice.** Decision IDs block **claim expansion** only; they do not block DESIGN packaging of the honest maturity map.

## Context

Corporate handoff revision 1 requires three complementary planning artifacts before Core deepening and partnership work proceed under a shared ranking:

1. **R-003** — A ranked P0–P5 maturation portfolio with owners, exit criteria, and LOC baselines for `schema.ts` and the fat `incident` / `capa` routers. Plumbing regulatory themes must not outrank P0/P1 without a recorded counsel or user override.
2. **R-013** — Partnership backlog epics (offline/outbox, assistive drafting, observation SLA, leading-indicator analytics, AI/RAG resilience, smoke extension) each declaring SoR persistence path, RBAC keys, `audit_log` or documented exception, and smoke/UAT hook. AI remains **propose → human-ack → persist**.
3. **R-014** — A D-001..D-012 register with owner + blocked/unblocked status so marketing/regulatory claim expansion fails closed until counsel/ops resolve the item.

Without these artifacts, delivery planning can promote OSHA/DSAR/chemicals Plumbing work ahead of audit coverage and schema health, or sell partnership AI features as autonomous SoR writers.

## Decision

### 1. Ranked portfolio (R-003)

Adopt [`docs/roadmap/ranked-portfolio.md`](../roadmap/ranked-portfolio.md) as the authoritative site maturation ranking:

| Rank | Theme |
|------|--------|
| **P0** | Audit coverage on Tier-1 mutations + GTM honesty |
| **P1** | Schema modularization |
| **P2** | Router / service thinning |
| **P3** | Field outbox depth |
| **P4** | Evidence binary upload |
| **P5** | Durable job queue (ops decision) |

LOC baselines are captured via `wc -l` at ADR authoring time and must be re-measured before P1/P2 execution. Kill criteria: Plumbing regulatory work (OSHA agency e-file, full DSAR automation, Tier2 Submit / EPA filing as Core) does not outrank P0/P1 unless the barrier playbook records an override artifact ID.

### 2. Partnership epic contracts (R-013)

Each partnership epic in the ranked portfolio doc declares:

- **SoR persistence path** — typed tRPC / Postgres IMS writes, never ad-hoc AI SQL
- **RBAC keys** — existing or named permission keys; no bypass
- **`audit_log` or exception** — domain create/status audits, or an explicit exception row
- **Smoke / UAT hook** — CI `@smoke`, unit non-transition proof, or staging UAT checklist

AI drafting and RAG paths stay **propose → human-ack → persist**. Assistants must not auto-close investigations, auto-verify CAPA effectiveness, or silently commit regulatory classification.

### 3. Decision register D-001..D-012 (R-014)

[`docs/barrier-resolution-playbook.md`](../barrier-resolution-playbook.md) gains a structured register whose IDs match corporate master-spec R-014:

| ID | Decision (summary) |
|----|---------------------|
| D-001 | OSHA agency export funding / claim gate |
| D-002 | DSAR export/erasure ownership |
| D-003 | OIDC JIT production org/role policy |
| D-004 | pg-boss vs HTTP cron default |
| D-005 | Chemicals Core vs permanent Plumbing |
| D-006 | Native mobile vs progressive web |
| D-007 | Commercial support SLA vs Apache 2.0 |
| D-008 | Production monitoring owner / scrape parity |
| D-009 | Object-storage evidence upload controls |
| D-010 | Field-outbox multi-device / photo policy |
| D-011 | Context Sync provenance retention under hold |
| D-012 | DEMO_MODE hard-fail outside development |

**Stability for ADR-S-005:** D-004, D-008, D-009, D-010, D-011, and D-012 keep these semantics so ops/evidence ADRs can reference them without renumbering. Unresolved rows block claim expansion only.

Narrative playbook sections (OIDC, job queue, Terraform, DSAR, OSHA) remain for sequencing detail; the register is the index for gate R-014.

### 4. PortCo Tier-1 wedge (R-013 commercial)

Pilot scope stays **Core + selected Connected** per [`docs/qa/portco-tier1-pilot-scope.md`](../qa/portco-tier1-pilot-scope.md). Tier-4 agency / native-connector gaps remain out of scope with honest buyer statements (procurement §12).

## Consequences

**Positive**

- Engineering and GTM share one ranked backlog; Plumbing regulatory work cannot silently jump the queue.
- Partnership epics are contract-shaped (SoR, RBAC, audit, smoke) before implementation ADRs expand them.
- Claim expansion has a stable D-ID checklist with owners.

**Negative / accepted trade-offs**

- Informal D-IDs that appear in older module-maturity footnotes are **not** authoritative; R-014 IDs in the barrier playbook win.
- Terraform remote state remains an operational barrier in narrative/ROADMAP but is outside D-001..D-012 (IaC landing-zone, not a marketing-claim gate).
- This ADR does not implement schema splits, object storage, or DEMO_MODE hard-fail — those land in later ADRs under the ranked themes / stable D-IDs.

## Out of scope (respect corporate boundary)

- No product code changes (`src/**`, `drizzle/migrations/**` excluded).
- No edits to `docs/module-maturity.md`, `docs/procurement-readiness.md`, `docs/regulatory-posture-boundary.md`, `docs/lifecycle/**`, `docs/qa/mutation-auditability-matrix.md`, `specs/threat-model.yaml`, `docs/JOB_QUEUE.md`, `docs/runbooks/**`, `docs/DSAR_PROCESS.md`, `docs/ai-governed-intake.md`, or `.corp-harness/**`.
- No self-marking of `site_verify` or `operations` gates.

## References

- Corporate master spec (revision 1) requirements R-003, R-013, R-014
- [`docs/roadmap/ranked-portfolio.md`](../roadmap/ranked-portfolio.md)
- [`docs/barrier-resolution-playbook.md`](../barrier-resolution-playbook.md)
- [`docs/qa/portco-tier1-pilot-scope.md`](../qa/portco-tier1-pilot-scope.md)
- [`docs/portco-module-value-assessment.md`](../portco-module-value-assessment.md)
- [`docs/procurement-portco-integration-budget.md`](../procurement-portco-integration-budget.md)
