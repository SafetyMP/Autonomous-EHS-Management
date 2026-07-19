# Module maturity tiers

Engineering and sales alignment for what is **Core** (fully operable), **Connected** (UI + cross-links), or **Plumbing** (API/event log only).

| Tier | Meaning | Examples |
|------|---------|----------|
| **Core** | Full workflow, audit trail, UAT coverage | Incidents, CAPA (register + detail + source traceability), inspections, approvals, audit trail |
| **Connected** | Dashboard UI and links into core spine | Risk assessments roster, env monitoring, consultation records, RAG corpus, incident→CAPA, **assurance hub**, **emergency prep**, **MOC register** (incl. ISO 14001:2026 Clause 6.3 fields), **Heat NEP program aid**, Context environmental-condition tags, grouped lifecycle navigation, **PortCo identity (SCIM/OIDC JIT)**, **HRIS/LMS inbound**, contractor renewal queue |
| **Plumbing** | Backend/integration only — banner in UI where exposed | DSAR automation, OSHA agency filing, **Chemical inventory / EPCRA hazard categories** (`/dashboard/chemicals`), native Workday OAuth |

**Gated (no nav / explicit banner):**

- Chemical inventory (Tier II) — Plumbing UI with maturity banner; not Core; not EPA filing
- DSAR — intake on Privacy; see `docs/DSAR_PROCESS.md`
- OSHA agency export — scaffold on Retention; not filing-ready

Update this table when promoting modules between tiers. Cross-reference [architecture-map.md](./architecture-map.md), [procurement-readiness.md](./procurement-readiness.md) §12, and PortCo tier mapping in [portco-module-value-assessment.md](./portco-module-value-assessment.md) / [qa/portco-tier1-pilot-scope.md](./qa/portco-tier1-pilot-scope.md).
