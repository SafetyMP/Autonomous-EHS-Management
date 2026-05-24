# Module maturity tiers

Engineering and sales alignment for what is **Core** (fully operable), **Connected** (UI + cross-links), or **Plumbing** (API/event log only).

| Tier | Meaning | Examples |
|------|---------|----------|
| **Core** | Full workflow, audit trail, UAT coverage | Incidents, CAPA (register + detail + source traceability), inspections, approvals, audit trail |
| **Connected** | Dashboard UI and links into core spine | Risk assessments roster, env monitoring, consultation records, RAG corpus, incident→CAPA, **assurance hub**, **emergency prep**, **MOC register**, grouped lifecycle navigation, **PortCo identity (SCIM/OIDC JIT)**, **HRIS/LMS inbound**, contractor renewal queue |
| **Plumbing** | Backend/integration only — banner in UI where exposed | DSAR automation, OSHA agency filing, Tier II inventory UI, native Workday OAuth |

**Gated (no nav / explicit banner):**

- Chemical inventory (Tier II) — schema only until UI ships
- DSAR — intake on Privacy; see `docs/DSAR_PROCESS.md`
- OSHA agency export — scaffold on Retention; not filing-ready

Update this table when promoting modules between tiers. Cross-reference [architecture-map.md](./architecture-map.md) and [procurement-readiness.md](./procurement-readiness.md) §12.
