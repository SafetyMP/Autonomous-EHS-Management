# Module maturity tiers

Engineering and sales alignment for what is **Core** (fully operable), **Connected** (UI + cross-links), or **Plumbing** (API/event log only).

| Tier | Meaning | Examples |
|------|---------|----------|
| **Core** | Full workflow, audit trail, UAT coverage | Incidents, CAPA, inspections, approvals, audit trail |
| **Connected** | Dashboard UI and links into core spine | Risk assessments roster, env monitoring, consultation records, RAG corpus, incident→CAPA |
| **Plumbing** | Backend/integration only — banner in UI where exposed | HRIS provision, LMS auto-reconcile, DSAR automation, OSHA agency filing, Tier II inventory UI |

**Gated (no nav / explicit banner):**

- Chemical inventory (Tier II) — schema only until UI ships
- DSAR — intake on Privacy; see `docs/DSAR_PROCESS.md`
- OSHA agency export — scaffold on Retention; not filing-ready

Update this table when promoting modules between tiers. Cross-reference [architecture-map.md](./architecture-map.md) and [procurement-readiness.md](./procurement-readiness.md) §12.
