# Procurement appendix — integrations, HRIS, and agent access

This appendix supports **RFP / diligence** conversations for PortCo and enterprise buyers. It clarifies what ships today, what requires partner or customer middleware, and how to answer **“MCP integration”** questions without conflating internal engineering tooling with tenant-facing product.

**Related docs:** [procurement-readiness.md](./procurement-readiness.md), [architecture-map.md](./architecture-map.md) §9, [cursor-tool-connections-deployment.md](./cursor-tool-connections-deployment.md), [CONTEXT.md](../CONTEXT.md) (Context Sync REST).

---

## 1. Integration scope summary

| Capability | Ships today | Buyer-facing statement |
|------------|-------------|------------------------|
| **Enterprise SSO (OIDC pilot)** | Optional Better Auth Generic OAuth when `OIDC_*` env vars are set | Supports corporate IdP sign-in; **does not** auto-provision tenants or map IdP groups to orgs without additional configuration ([OIDC_JIT_PROVISIONING.md](./OIDC_JIT_PROVISIONING.md)). |
| **Inbound integration webhook** | `POST /api/integration/inbound` with bearer `INTEGRATION_INBOUND_SECRET` | Canonical JSON envelopes for LMS and HRIS events; idempotent replays; optional async processing via pg-boss ([JOB_QUEUE.md](./JOB_QUEUE.md)). |
| **HRIS membership sync** | `hris_membership_sync` envelope | Updates **`membership.siteId`** for an **existing** user who **already has org membership** — not full roster provisioning. |
| **LMS training completion** | `training_completion` envelope | Logs to `integration_event`; **does not** automatically write `training_record` rows (reconciliation is operator-owned). |
| **Integration operator UI** | `/dashboard/integrations` | Event backlog, connector mapping JSON, operational webhooks, warehouse export slice. |
| **Outbound operational webhooks** | Org-configured HTTPS POST + HMAC | Failure notifications and SLA escalations — see [operational-webhooks.md](./operational-webhooks.md). |
| **Context Sync REST (agent read)** | `/api/contextsync/*` when tenant opt-in enabled | Governed read/sync for IDE and agent clients — **not** branded as MCP; see §3. |
| **Named HRIS connectors (Workday, ADP, BambooHR)** | **Not productized** | iPaaS or SI middleware maps vendor APIs to canonical envelopes — see [hris-portco-integration-playbook.md](./roadmap/hris-portco-integration-playbook.md). |
| **SCIM / directory sync** | **Not shipped** | Roadmap prerequisite for turnkey PortCo roster sync — see HRIS playbook. |
| **Customer MCP server** | **Not shipped** | Governed agent access via Context Sync REST; optional MCP adapter on roadmap — see [adr/0001-mcp-context-sync-strategy.md](./adr/0001-mcp-context-sync-strategy.md). |
| **Cursor MCP (Vercel, Neon, Slack, etc.)** | **Internal dev tooling only** | Contributor IDE ergonomics — **never** list as a customer integration ([cursor-tool-connections-deployment.md](./cursor-tool-connections-deployment.md)). |

---

## 2. HRIS webhook — honest limits

### What `hris_membership_sync` does

Upstream systems (HRIS, iPaaS, or custom middleware) POST a canonical payload validated by [`src/lib/integration/inboundEnvelope.ts`](../src/lib/integration/inboundEnvelope.ts):

```json
{
  "kind": "hris_membership_sync",
  "organizationId": "<uuid>",
  "workerEmail": "worker@example.com",
  "siteId": "<optional-site-uuid>",
  "idempotencyKey": "optional-replay-key"
}
```

Processing ([`src/server/services/hrisMembershipSyncIngest.ts`](../src/server/services/hrisMembershipSyncIngest.ts)):

1. Normalizes `workerEmail` and looks up an existing Better Auth user.
2. Requires an existing `membership` row for `(organizationId, userId)`.
3. Optionally validates and sets `membership.siteId` when `siteId` is provided.
4. Writes `audit_log` (`integration.hris_membership_sync`) and updates `integration_event` status.

### What it does **not** do

| Limit | Implication for PortCo rollout |
|-------|--------------------------------|
| **No user creation** | New hires from Workday/ADP do not appear in EHS until provisioned elsewhere (invite, seed, SCIM — future). |
| **No membership creation** | HRIS cannot add a user to an org via webhook alone. |
| **No role / RBAC updates** | Role assignment remains in-app or via future directory sync. |
| **No deprovisioning** | Terminated workers are not auto-deactivated; offboarding is manual until SCIM/JML ships. |
| **Site assignment only** | Department, manager, job title, cost center are **not** in the current envelope. |
| **Connector mapping JSON is documentation** | Rows in `integration_connector_mapping` do **not** transform payloads at runtime ([integration-connector-mapping.md](./integration-connector-mapping.md)). |

### Failure handling

- Processing failures mark `integration_event` as `failed` and may emit `integration.processing_failed` on configured operational webhooks.
- Common errors: `"No user matches workerEmail"`, `"User is not a member of this organization"`, invalid `siteId`.
- Operators monitor `/dashboard/integrations` and may reprocess failed events when root cause is fixed.

### Typical PortCo path today

1. Configure **OIDC SSO** against corporate IdP (often shared with HRIS identity).
2. **Bootstrap users and memberships** (admin invite, seed script, or custom provisioning job).
3. Route HRIS location/worker updates through **Workato / Boomi / custom worker** → canonical webhook.
4. Plan **Phase 1 identity** (SCIM, multi-org OIDC JIT) per [hris-portco-integration-playbook.md](./roadmap/hris-portco-integration-playbook.md).

---

## 3. Context Sync vs MCP — diligence framing

Buyers increasingly ask for **“MCP integrations.”** In questionnaires, distinguish three layers:

```mermaid
flowchart TB
  subgraph customer [Customer / tenant scope]
    CtxSync["Context Sync REST\n/api/contextsync/*"]
    Inbound["Inbound webhooks\n/api/integration/inbound"]
    SSO["Enterprise SSO OIDC"]
  end

  subgraph internal [Internal engineering only]
    CursorMCP["Cursor MCP servers\nVercel, Neon, Slack"]
  end

  subgraph roadmap [Roadmap optional]
    MCPAdapter["Thin MCP adapter package\nwraps Context Sync"]
    ServiceId["Service-agent OAuth\nclient credentials"]
  end

  AgentClient[Agent or IDE client] --> CtxSync
  HRIS[HRIS / iPaaS] --> Inbound
  IdP[Corporate IdP] --> SSO
  MCPAdapter -.-> CtxSync
  ServiceId -.-> CtxSync
  Contributor[Engineering contributor] --> CursorMCP
```

### Context Sync REST (ships)

- **Purpose:** Governed read/sync of `ctx://` artifacts and read-only IMS snapshots for agents and IDE tooling.
- **Tenant control:** `organization.context_sync_enabled` (default `false` for new orgs); org admin toggle with audit.
- **Auth:** Better Auth session; `X-Actor-Id` must equal `human:{session.user.id}`; optional `X-Agent-Class` with org-bound claims.
- **Writes to regulated IMS data:** Blocked on Context Sync paths — mutations stay on tRPC / dashboard (compliance boundary).
- **Rate limits:** Upstash sliding window; optional per-org daily read quota and provenance caps ([CONTEXT.md](../CONTEXT.md)).

**RFP answer template:** *“Autonomous EHS provides a governed Context Sync REST API for agent and IDE read access to compliance context, with tenant opt-in, RBAC, grants, provenance, and rate limits. Regulated workflow mutations remain on authenticated tRPC procedures and the EHS Console.”*

### MCP (Model Context Protocol)

| Question | Answer |
|----------|--------|
| Do you ship a customer MCP server? | **No** — not in this repository today. |
| Can agents access EHS data? | **Yes** — via Context Sync REST under a human session (and future service identities per ADR). |
| Will you support MCP? | **Optional roadmap** — thin adapter wrapping Context Sync; decision in [adr/0001-mcp-context-sync-strategy.md](./adr/0001-mcp-context-sync-strategy.md). |
| Is Cursor MCP a product feature? | **No** — internal contributor tooling only. |

### Do not conflate

- **HRIS integration** = identity, roster, site assignment (who works where).
- **Context Sync / MCP** = agent read access to compliance artifacts (what the system knows).
- **Cursor MCP** = how engineers deploy and operate the SaaS — not a PortCo adoption path.

---

## 4. RFP risk register (integration-specific)

Add these rows to diligence responses alongside [procurement-readiness.md](./procurement-readiness.md) §12:

| Risk / question | Current state | Buyer-facing statement |
|-----------------|---------------|-------------------------|
| **Turnkey Workday connector** | Generic webhook + operator mapping docs | Certified Workday playbook and iPaaS recipes are **roadmap**; today requires middleware mapping to canonical JSON. |
| **Automated joiner/mover/leaver** | Not shipped | User lifecycle is manual or custom until SCIM / directory sync (see HRIS playbook Phase 1). |
| **LMS → training records** | Event log only | Inbound completions are auditable events; reconciliation into `training_record` is **planned**, not automatic. |
| **MCP server in product** | Not shipped | Context Sync REST is the supported agent interoperability surface; MCP adapter is optional future packaging. |
| **Multi-entity PE portfolio** | Single-org OIDC JIT pilot | IdP group → org mapping requires Phase 1 identity work for multi-legal-entity portfolios. |

---

## 5. Roadmap pointers (corrective actions)

| Theme | Design doc |
|-------|------------|
| Next-action dashboard UX | [roadmap/action-queue-dashboard-spec.md](./roadmap/action-queue-dashboard-spec.md) |
| PortCo HRIS / SCIM / Workday | [roadmap/hris-portco-integration-playbook.md](./roadmap/hris-portco-integration-playbook.md) |
| MCP vs Context Sync strategy | [adr/0001-mcp-context-sync-strategy.md](./adr/0001-mcp-context-sync-strategy.md) |

---

## 6. Implementation methodology reminder

For enterprise pilots, the **Integrate** phase in [procurement-readiness.md](./procurement-readiness.md) §2 should assume:

1. **Discover** — Which HRIS, IdP, and iPaaS the PortCo already operates.
2. **Configure** — SSO, inbound secret, org/sites, RBAC roles.
3. **Integrate** — Middleware → canonical webhook; Context Sync opt-in if agents need read access.
4. **Verify** — Integration event health, failed-event webhooks, UAT on [staging-uat-desk-to-field.md](./qa/staging-uat-desk-to-field.md).
5. **Operate** — Monitor `/dashboard/integrations`, warehouse exports, audit trail.

Track barrier resolution in [barrier-resolution-playbook.md](./barrier-resolution-playbook.md) when integration owners are assigned.
