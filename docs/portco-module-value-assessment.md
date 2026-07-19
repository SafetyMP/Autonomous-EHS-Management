# PortCo module value assessment

Module-by-module evaluation of whether Autonomous EHS implementations deliver enough value for a typical private-equity portfolio company—based on workflow depth, documented gaps, and procurement posture.

**Actionable deliverables from this assessment:**

| Deliverable | Document |
|-------------|----------|
| Tier 1 pilot scope (90 days, one site) | [qa/portco-tier1-pilot-scope.md](./qa/portco-tier1-pilot-scope.md) — **Core + selected Connected**; Tier-4 agency gaps OOS |
| Ranked maturation + partnership contracts | [roadmap/ranked-portfolio.md](./roadmap/ranked-portfolio.md) ([ADR-S-002](./adr/ADR-S-002-ranked-portfolio-barriers.md)) |
| UAT sign-off + audit trail gaps | [qa/portco-uat-signoff-record.md](./qa/portco-uat-signoff-record.md) |
| iPaaS / SI budget worksheet | [procurement-portco-integration-budget.md](./procurement-portco-integration-budget.md) |
| Program vs agency boundary (counsel) | [regulatory-posture-boundary.md](./regulatory-posture-boundary.md) |

**Related:** [module-maturity.md](./module-maturity.md), [procurement-readiness.md](./procurement-readiness.md), [workflow-depth.md](./workflow-depth.md), [architecture-map.md](./architecture-map.md), [barrier-resolution-playbook.md](./barrier-resolution-playbook.md) (D-001..D-012).

---

## Executive answer

**Conditionally yes** — a PortCo will find enough value if they buy a **scoped IMS pilot** (program-of-record for incidents, CAPA, inspections, permits, training proof, contractor credentials, HRIS-driven identity), not a **full enterprise EHSQ suite replacement**.

The implementation is **real operational software** (Postgres system of record, RBAC, state machines, approvals, audit trail, cron escalations)—not a thin AI wrapper. Roughly **half the 30 dashboard modules** are deep enough to anchor a pilot; the rest are **credible registers** that add breadth but not standalone switching cost.

---

## What “enough value” means for a PortCo

| Need | Module(s) | Verdict |
|------|-----------|---------|
| Auditable incident → investigation → closure | Incidents, evidence, audit trail | **Strong** |
| Corrective action with sign-off | CAPA + Approvals | **Strong** |
| Field capture (observations, inspections, PTW) | Observations, Inspections, Work permits | **Good** |
| Corporate identity / roster sync | Integrations, SCIM, OIDC JIT | **Good (with iPaaS tax)** |
| Contractor COI / training / insurance | Contractors + HRIS sync | **Strong wedge** |
| ISO programme evidence | Internal audits, mgmt review, documents | **Adequate registers** |
| Executive visibility | Command center, analytics, action queue | **Good** |
| Regulatory filing replacement | OSHA sidecar, env permits, Tier II | **Weak for agency role** |

---

## Module tiers

### Tier 1 — Anchor modules

Pure transition tables, approval integration, `writeAuditLog`, smoke coverage. See [portco-tier1-pilot-scope.md](./qa/portco-tier1-pilot-scope.md).

| Module | Evidence |
|--------|----------|
| Incidents | [`incidentTransitions.ts`](../src/lib/workflow/incidentTransitions.ts), smoke intake |
| CAPA | [`capaTransitions.ts`](../src/lib/workflow/capaTransitions.ts), approval path |
| Approvals | Serial chains for CAPA, PTW, env permits |
| Observations | SLA → `escalation_event` |
| Contractors | Credentials, renewal queue, `hris_contractor_sync` |
| Integrations | HRIS v2, SCIM, OIDC JIT ([playbook](./roadmap/hris-portco-integration-playbook.md)) |

### Tier 2 — Solid operational

Inspections, PTW, env regulatory permits, risk/JSAs, command center, environment registers, training, documents, audit trail/retention. Good value; gaps vs incumbents documented in [procurement-readiness.md](./procurement-readiness.md) §12.

### Tier 3 — Breadth registers

Internal audits, mgmt review, emergency, MOC, ISO context, consultation, program overview, import, workflow catalog. IMS completeness for RFPs; unlikely to close a deal alone.

### Tier 4 — Explicit gaps

OSHA agency e-filing, full DSAR automation, native Workday OAuth, occupational health, first-class notifications, code-defined workflow configurability. See [regulatory-posture-boundary.md](./regulatory-posture-boundary.md) and [portco-deferred-connectors.md](./roadmap/portco-deferred-connectors.md).

---

## Verdict by buyer scenario

| PortCo profile | Enough value? | Lead modules |
|----------------|---------------|--------------|
| PE portfolio roll-out (SSO, HRIS, contractors) | **Yes, scoped** | Integrations, Contractors, Incidents, CAPA |
| Single site ISO/OSHA (replace spreadsheets) | **Yes** | Incidents, CAPA, Observations, Inspections |
| Full Intelex/Cority replacement | **No** | OH, agency filing, configurability gaps |
| Mobile-first field inspections | **Partial** | No native app parity |
| Regulatory filing system of record | **No** | Programme data only |

---

## Bottom line

**Core spine delivers enough PortCo value** — roughly 6–8 modules with genuine workflow depth plus ~15 registers for IMS breadth. Value is **not evenly distributed**.

A PortCo **will** find enough value if success criteria = auditable programme management + HRIS-driven identity + contractor wedge, with iPaaS budget and counsel-scoped regulatory posture.

A PortCo **will not** find enough value if success criteria = turnkey Workday, OSHA e-file, mobile inspection leader, occupational health, or no-code process design.
