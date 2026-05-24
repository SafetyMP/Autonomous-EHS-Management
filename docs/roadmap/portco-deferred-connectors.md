# PortCo deferred connectors (explicit non-goals for OSS v1)

Items below are **intentionally deferred** until customer demand, maintenance budget, or partner packaging justifies native implementation. PortCo Phases 1–3 ship without them via iPaaS + SCIM + inbound webhooks.

| Item | Why deferred | Supported alternative today |
|------|--------------|----------------------------|
| **Native Workday OAuth REST** | High maintenance; RAAS/EIB + iPaaS covers most PortCos | [workday-hris-connector.md](../runbooks/workday-hris-connector.md) + `connectorPresets` |
| **Productized ADP connector** | Same | [adp-hris-connector.md](../runbooks/adp-hris-connector.md) |
| **Productized BambooHR connector** | Same | [bamboohr-hris-connector.md](../runbooks/bamboohr-hris-connector.md) |
| **Customer MCP server** | Context Sync REST ships with governance | [adr/0001-mcp-context-sync-strategy.md](../adr/0001-mcp-context-sync-strategy.md) |
| **Visitor kiosks** | Hardware + VMS scope | Contractor wedge via `external_party` + inbound sync |
| **Native VMS OAuth** | Partner/VMS-specific APIs | `hris_contractor_sync` envelope + iPaaS |
| **Runtime connector-mapping transforms** | Canonical Zod envelopes reduce app complexity | Operator JSON on `/dashboard/integrations` (documentation) |
| **Roster auto-remediation** | Policy-dependent; counsel review for auto-deprovision | Detect-only drift + manual JML via HRIS/SCIM |

**When to revisit:** RFP explicitly requires turnkey Workday without middleware, or PE sponsor mandates MCP-branded agent access. Track demand in procurement conversations; do not block PortCo pilots on these items.

**Related:** [hris-portco-integration-playbook.md](./hris-portco-integration-playbook.md), [procurement-integrations-appendix.md](../procurement-integrations-appendix.md) §1.
