# PortCo integration budget guide

Planning worksheet for **iPaaS and systems integrator (SI) cost** when rolling Autonomous EHS into a private-equity portfolio company. Native Workday, ADP, and BambooHR OAuth connectors are **roadmap/deferred**—pilots rely on middleware documented in runbooks.

**Pilot wedge:** Tier-1 scope is **Core + selected Connected** only ([qa/portco-tier1-pilot-scope.md](./qa/portco-tier1-pilot-scope.md)); Tier-4 agency / native-connector gaps stay out of pilot KPIs ([ADR-S-002](./adr/ADR-S-002-ranked-portfolio-barriers.md)).

**Related:** [procurement-integrations-appendix.md](./procurement-integrations-appendix.md), [roadmap/portco-deferred-connectors.md](./roadmap/portco-deferred-connectors.md), [roadmap/hris-portco-integration-playbook.md](./roadmap/hris-portco-integration-playbook.md), [roadmap/ranked-portfolio.md](./roadmap/ranked-portfolio.md), runbooks under [`docs/runbooks/`](./runbooks/).

---

## What ships in product vs what you budget separately

| Capability | In product license / self-host | Customer / PortCo budget |
|------------|-------------------------------|---------------------------|
| Canonical inbound webhook + idempotency | Yes | HTTPS endpoint, secret rotation |
| SCIM Users/Groups MVP + OIDC JIT rules UI | Yes | IdP app registration, claim design |
| HRIS v2 joiner/mover/leaver ingest | Yes | **iPaaS recipes** mapping vendor APIs → envelope |
| LMS → `training_record` | Yes | LMS export or iPaaS |
| Contractor `hris_contractor_sync` | Yes | Vendor feed or iPaaS |
| Roster drift + reconcile cron | Yes | Nightly export job from HRIS |
| Operational webhooks (failures, SLA) | Yes | Teams/ServiceNow/SIEM adapter |
| **Native Workday OAuth REST** | **No** ([deferred](./roadmap/portco-deferred-connectors.md)) | Workato/Boomi/custom worker |
| **Runtime connector-mapping transforms** | **No** (JSON is documentation) | Transform logic lives in iPaaS |
| **Customer MCP server** | **No** (Context Sync REST) | N/A unless RFP mandates MCP adapter |

---

## Typical cost categories

Adjust hours and vendor list for your PortCo. Ranges are **order-of-magnitude** for mid-market planning—not quotes.

### One-time (per PortCo entity or pilot site)

| Work item | Owner | Indicative effort | Notes |
|-----------|-------|-------------------|-------|
| IdP SSO app (Okta / Entra / Ping) | IT | 8–24 h | OIDC; JIT claim rules on `/dashboard/integrations` |
| SCIM provisioning + group→role map | IT | 16–40 h | Preferred for joiners; pairs with HRIS for attributes |
| HRIS location → EHS `site.id` map | SI / iPaaS | 16–40 h | Maintain lookup table in middleware |
| Workday / ADP / BambooHR recipe | iPaaS + SI | 24–80 h | See [workday-hris-connector.md](./runbooks/workday-hris-connector.md), [adp-hris-connector.md](./runbooks/adp-hris-connector.md), [bamboohr-hris-connector.md](./runbooks/bamboohr-hris-connector.md) |
| LMS completion feed | iPaaS | 8–24 h | `training_completion` envelope |
| Contractor vendor feed | iPaaS | 8–24 h | `hris_contractor_sync` |
| Staging JML test + production cutover | SI + EHS + IT | 16–32 h | [portco-staging-pilot.md](./qa/portco-staging-pilot.md) |
| Operational webhook → Teams/SIEM | SI | 4–16 h | [operational-webhooks.md](./operational-webhooks.md) |

### Recurring (annual)

| Item | Indicative range | Notes |
|------|------------------|-------|
| iPaaS platform (Workato, Boomi, MuleSoft, etc.) | $15k–$80k+ / yr | Tier and recipe count driven |
| SI retainer (mapping changes, failed-event triage) | 0.1–0.25 FTE | Weekly failed-event review on `/dashboard/integrations` |
| IdP / HRIS vendor fees | (existing) | Usually already paid by PortCo |
| Secret rotation + access reviews | 4–8 h / quarter | SCIM bearer, `INTEGRATION_INBOUND_SECRET` |

---

## Portfolio roll-up multiplier

PE sponsors rolling **N legal entities** into separate EHS orgs:

| Pattern | Integration cost driver |
|---------|-------------------------|
| **Shared IdP, one HRIS tenant** | One SCIM app + one iPaaS recipe; **multi-org OIDC JIT** claim rules per entity |
| **Separate HRIS per PortCo** | Repeat iPaaS recipe per vendor instance |
| **Shared services center** | Central SI maintains location maps; marginal cost per add-on acquisition lower |

Do **not** assume zero marginal cost per acquisition—budget **8–24 h** minimum per new entity for org setup, site UUIDs, RBAC templates, and JIT rule validation.

---

## Decision tree: when native OAuth might be worth funding

Revisit [portco-deferred-connectors.md](./roadmap/portco-deferred-connectors.md) only if:

1. RFP **mandates** turnkey Workday without customer middleware **and** deal size justifies maintenance, or  
2. **>5 PortCos** on identical Workday tenant want a packaged connector product.

Until then, **iPaaS + SCIM** is the supported path and should appear explicitly in SOWs.

---

## SOW language (paste-ready)

> Autonomous EHS provides inbound integration APIs (HRIS v2, LMS, contractor sync, roster snapshot), SCIM 2.0 Users/Groups (MVP), and OIDC SSO with JIT claim rules. **Customer** is responsible for iPaaS or custom middleware mapping HRIS/LMS vendor APIs to canonical JSON envelopes, IdP application registration, location-to-site UUID maintenance, and operational monitoring of `/dashboard/integrations`. Native OAuth connectors for Workday, ADP, or BambooHR are **not** included in baseline scope unless separately contracted.

---

## Pilot budget checklist

- [ ] iPaaS vendor selected and licensed for staging + prod
- [ ] SI or internal integration owner named
- [ ] Runbook chosen (Workday / ADP / BambooHR)
- [ ] IdP + SCIM path agreed (vs HRIS-only webhook)
- [ ] Failed-event review cadence assigned
- [ ] Lines added to PortCo IT budget (one-time + annual rows above)
- [ ] ROI worksheet includes integration effort ([procurement-readiness.md](./procurement-readiness.md) §6)
