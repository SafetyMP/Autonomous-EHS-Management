# ADR-S-003: Core spine audit coverage, smoke depth, and AI non-transition proofs

**Status:** Proposed (site delivery, revision 1)
**Date:** 2026-07-19
**Program:** `ehs` (corporate revision 1)
**Requirements:** R-002 (autonomy posture / AI proposal-only), R-007 (Core spine quality depth), R-008 (audit_log coverage gates)
**Related:** [mutation-auditability-matrix.md](../qa/mutation-auditability-matrix.md), [risk-based-coverage-matrix.md](../qa/risk-based-coverage-matrix.md), [ADR-S-001 Honesty & promotion](ADR-S-001-honesty-promotion.md), [ADR-S-002 Ranked portfolio](ADR-S-002-ranked-portfolio-barriers.md)

**Not legal advice.** This ADR hardens forensic and CI evidence for Core-spine mutations; it does not assert universal `audit_log` completeness.

## Context

Corporate handoff revision 1 treats audit instrumentation and Core lifecycle smoke as **P0** maturation work:

1. **R-008** — Product-backed must-audit list for the Core spine; CI that fails when a new tRPC `.mutation(` lacks `writeAuditLog` in-router or a documented one-hop callee; explicit residual REST/cron/worker gaps (never implied complete).
2. **R-007** — Before labeling a module Core, require CI `@smoke` (or staging UAT evidence) for CAPA → verified with source traceability, at least one Approvals decide path, and audit-trail list (plus exportCsv when Core). PTW stays Connected — this ADR does **not** promote `/dashboard/permits`.
3. **R-002** — AI remains proposal-only: Vitest must prove `aiAssistant` / `aiDrafts` paths do not invoke regulated status-transition mutations.

Existing docs already inventory routers, but the matrix lacked a named Core-spine must-audit contract, the grep script was inventory-only (non-failing), and Playwright `@smoke` covered intake/auth gates without CAPA / approvals / audit-trail lifecycle depth.

## Decision

### 1. Core-spine must-audit list (R-008)

[`docs/qa/mutation-auditability-matrix.md`](../qa/mutation-auditability-matrix.md) gains an authoritative **Core-spine must-audit** section covering:

| Surface | Must-audit mutations (summary) |
|---------|--------------------------------|
| Incident | `create`, `update`, `updateStatus` |
| CAPA | `create`, `updateStatus`, `assignOwner` |
| Approval | `submit*`, `decideRequest` (in-router and/or one-hop service) |
| Context Sync admin | agent-class claim create/delete; org `updateContextSyncEnabled` |
| Retention overrides | `compliance.dataRetention.upsertPolicy` and related lifecycle audits |

Residual REST / cron / worker gaps remain tabulated explicitly (integration inbound queue timing, SCIM REST, SLA escalations, etc.).

### 2. Failing audit matrix greps (R-008)

[`scripts/audit-matrix-greps.sh`](../../scripts/audit-matrix-greps.sh) continues the inventory dump and **exits non-zero** when any `src/server/trpc/routers/**/*.ts` file contains `.mutation(` without:

- an in-file `writeAuditLog` call, **or**
- a documented entry in the script’s one-hop allowlist (mirrored in the matrix)

`npm run audit:matrix-greps` stays the entry point; CI `verify` runs it. Periodic matrix refresh after router refactors remains a human checklist item.

### 3. Core-spine Playwright `@smoke` (R-007)

New specs under [`tests/e2e/smoke/`](../../tests/e2e/smoke/) (skip without `PLAYWRIGHT_E2E_EMAIL` / `PLAYWRIGHT_E2E_PASSWORD`, same as other signed-in smokes):

1. CAPA lifecycle to **verified** with **Source & context** incident link  
2. Approvals **decide** path (CAPA plan approve)  
3. Audit-trail **list** shows a mutation row; **Download CSV** exercised when Core  

PTW is out of scope for Core promotion in this ADR.

### 4. AI non-transition Vitest (R-002)

[`tests/unit/lib/ai/ai-non-transition.test.ts`](../../tests/unit/lib/ai/ai-non-transition.test.ts) proves `aiAssistant` / `aiDrafts` (and their intake draft pipeline) do not call regulated status-transition entry points (`capa.updateStatus`, `incident.updateStatus`, approval decide, etc.). AI may still propose drafts and, after human ack, persist non-lifecycle register rows (`aiDrafts.applyAspectDraft`) with `writeAuditLog`.

### 5. UAT / risk matrix cross-links

Staging and PortCo UAT docs plus [`risk-based-coverage-matrix.md`](../qa/risk-based-coverage-matrix.md) point at the Core-spine smoke IDs and the failing grep gate so promotion packets can cite executable evidence.

## Consequences

**Positive**

- New unaudited tRPC mutations fail CI before merge.
- Core CAPA / approvals / audit-trail paths have named `@smoke` coverage.
- Procurement can cite the must-audit list and residual gaps without implying completeness.
- AI autonomy posture has an executable non-transition proof.

**Negative / residual**

- File-level mutation↔`writeAuditLog` heuristic can miss a mutation that shares a file with an audited sibling; deep illegal-transition asserts remain in Vitest integration tests.
- Signed-in smoke still depends on CI seed credentials locally.
- REST/cron/worker gaps remain residual risk until product closes them.

## Compliance

| Check | Evidence |
|-------|----------|
| Must-audit list + residual gaps | `docs/qa/mutation-auditability-matrix.md` |
| Failing greps in CI | `npm run audit:matrix-greps` + `.github/workflows/ci.yml` verify step |
| Core spine smoke | `tests/e2e/smoke/core-spine-*.spec.ts` (`@smoke`) |
| AI non-transition | `tests/unit/lib/ai/ai-non-transition.test.ts` |
| PTW not promoted | No `module-maturity.md` edits; PTW remains Connected |
