# PortCo Tier 1 pilot scope (90 days)

Scoped pilot definition for private-equity portfolio companies. Limits go-live surface to **Core + selected Connected** modules with **workflow depth**, **audit instrumentation**, and **automated smoke coverage**—the spine that proves value before expanding to Tier 2/3 registers or Plumbing surfaces.

**Maturity terms:** [module-maturity.md](../module-maturity.md) / [ADR-S-001](../adr/ADR-S-001-honesty-promotion.md). **Wedge ranking:** [ranked-portfolio.md](../roadmap/ranked-portfolio.md) (R-013) + [ADR-S-002](../adr/ADR-S-002-ranked-portfolio-barriers.md).

**Related:** [portco-module-value-assessment.md](../portco-module-value-assessment.md), [procurement-readiness.md](../procurement-readiness.md) §2 / §12, [portco-staging-pilot.md](./portco-staging-pilot.md) (integration JML), [staging-uat-desk-to-field.md](./staging-uat-desk-to-field.md) (business UAT).

---

## Wedge boundary (Core + selected Connected)

| Include | Exclude from pilot success |
|---------|----------------------------|
| **Core** spine: Incidents, CAPA, Approvals, Observations, Contractors, Integrations/identity, command center / tasks | **Plumbing** regulatory filing / full DSAR automation sold as Core |
| **Selected Connected** (optional if PortCo pain is field capture): Inspections, Work permits (PTW) — PTW stays Connected until dedicated smoke exists | **Tier-4 agency / suite gaps** (below) — always out of scope for Tier-1 pilot KPIs |

Buyer-fit **NO** when success criteria require turnkey Workday OAuth, OSHA e-file, native mobile inspection leader, OH clinic, or no-code process design.

---

## Pilot objective

Prove on **one site** (or one legal entity within one org):

1. **Incident → investigation → closure** with evidence retained and visible in audit trail.
2. **CAPA** with human approval and effectiveness verification (`verified` state).
3. **Contractor credential** tracking with renewal queue and optional HRIS sync.
4. **Corporate identity** via OIDC and/or SCIM + HRIS location updates via iPaaS.

Parallel reporting against legacy tools continues through the **Verify** phase until program leadership approves cutover.

### Field capture expectations

- **Mobile:** responsive web only—no native iOS/Android app in baseline scope.
- **Offline:** durable field outbox requires tenant flag **`NEXT_PUBLIC_FIELD_OUTBOX=1`** ([offline-field-outbox.md](../offline-field-outbox.md)). Without it, intake forms need an online connection.
- **Photos** cannot be queued offline when outbox is enabled—workers should attach photos when connected or follow site SOP.

---

## In scope — Tier 1 modules

| Module | Routes | Pilot success criteria |
|--------|--------|------------------------|
| **Incidents** | `/dashboard/incidents`, `/new`, `/[id]` | Median closeout tracked; investigation artifacts saved; sensitive-read RBAC validated |
| **CAPA** | `/dashboard/capa`, `/[capaId]` | At least one CAPA through `pending_approval` → `verified`; source traceability from incident or observation |
| **Approvals** | `/dashboard/approvals` | Serial approve/deny on CAPA plan; escalation visible if configured |
| **Observations** | `/dashboard/observations`, `/new`, `/[id]` | Leading-indicator capture; optional link to CAPA |
| **Contractors** | `/dashboard/contractors`, `/[id]` | Credential expiry queue; at least one `hris_contractor_sync` or manual credential |
| **Integrations / PortCo identity** | `/dashboard/integrations` | OIDC JIT or SCIM group→role; HRIS webhook for joiner/mover/leaver on pilot site |
| **Command center / Tasks** | `/dashboard`, `/dashboard/tasks` | Action queue surfaces pilot work items; KPIs load for pilot site |

**Optional Tier 1 adjacency** (include if the PortCo’s pain is field capture, not identity):

- **Inspections** — `/dashboard/inspections` (state machine + smoke intake)
- **Work permits (PTW)** — `/dashboard/permits` (approval chain; distinct from environmental permits)

---

## Explicitly out of scope (pilot phase)

### Tier-4 / agency gaps (always OOS for Tier-1 KPIs)

These remain **out of scope** for pilot success and buyer statements even if an RFP asks; point to procurement §12 honesty language and barrier register D-001 / D-002 / D-006:

| Area | Reason |
|------|--------|
| OSHA agency e-filing | Placeholder only — D-001 blocked ([procurement-readiness.md](../procurement-readiness.md) §12) |
| Full DSAR automation | Intake only — D-002 blocked ([DSAR_PROCESS.md](../DSAR_PROCESS.md)) |
| Native Workday / ADP / BambooHR OAuth | iPaaS path ([procurement-portco-integration-budget.md](../procurement-portco-integration-budget.md)) |
| Occupational health clinic depth | Tier-4 gap — not Core |
| Native iOS/Android field app | Responsive web only — D-006 blocked |
| No-code workflow designer | Code-defined workflows only |

### Defer to Phase 2 (after Tier-1 sign-off)

| Area | Reason |
|------|--------|
| Internal audits, MOC, emergency, mgmt review | Tier 3 registers—breadth, not pilot proof |
| Environmental regulatory permits, Tier II chemical UI | Agency filing not claimed; counsel boundary (D-005) |
| Portfolio-wide multi-org rollout | One org + one site first; expand after metrics |

---

## Roles required on pilot site

| Role | Purpose |
|------|---------|
| **Field contributor** | Create incidents, observations; field layout |
| **Supervisor / EHS manager** | Investigate, assign CAPA, approve or route |
| **Org admin** | Integrations, SCIM/OIDC, RBAC templates |
| **Integration operator** | iPaaS recipe, webhook secret, roster mapping |

Seed or configure via [`scripts/seed.ts`](../../scripts/seed.ts) patterns; mirror production role names in staging before UAT.

---

## 90-day timeline

| Week | Milestone |
|------|-----------|
| **1–2** | Discover: site UUID, HRIS location map, IdP app, iPaaS owner ([portco-staging-pilot.md](./portco-staging-pilot.md) Discover/Configure) |
| **3–4** | Configure: RBAC, retention policy (counsel), integration secrets |
| **5–6** | Integrate: SCIM/OIDC + HRIS webhook; `npm run portco:pilot-verify` green |
| **7–10** | Operate pilot workflows: incident → CAPA → closure; contractor queue live |
| **11–12** | Verify: parallel metrics vs legacy; [portco-uat-signoff-record.md](./portco-uat-signoff-record.md) completed |

---

## ROI metrics (fill from [procurement-readiness.md](../procurement-readiness.md) §6)

| Metric | Baseline | Pilot target |
|--------|----------|--------------|
| Median incident closeout (days) | | |
| CAPA cycle time (days) | | |
| Contractor onboarding / credential clearance (days) | | |
| Audit preparation hours (est.) | | |

Store approved narratives under [`docs/case-studies/`](../case-studies/) using [pilot-template.md](../case-studies/pilot-template.md).

---

## Engineering verification (before business sign-off)

```bash
npm run verify
npm run audit:matrix-greps
npm run portco:pilot-verify
# Optional live staging:
# PORTCO_PILOT_BASE_URL=... PORTCO_PILOT_ORG_ID=... INTEGRATION_INBOUND_SECRET=... npm run portco:pilot-verify -- --live
```

Smoke intake flows (CI): incident, observation, inspection, environmental permit, risk assessment — Tier 1 pilot **requires** incident intake at minimum.

---

## Sign-off

| Gate | Owner | Date | Result |
|------|-------|------|--------|
| Tier 1 engineering verify | Engineering | | Pass / Hold |
| Integration JML (staging) | IT / integration | | Pass / Hold |
| Business UAT (Tier 1 rows) | EHS program leadership | | **APPROVED FOR PILOT** / **HOLD** |

Business UAT uses Tier 1 rows in [portco-uat-signoff-record.md](./portco-uat-signoff-record.md).
