# ADR 0001: MCP vs Context Sync — agent interoperability strategy

**Status:** Accepted (roadmap direction)  
**Date:** 2026-05-24  
**Deciders:** Product / engineering (CTO feedback remediation)  
**Related:** [procurement-integrations-appendix.md](../procurement-integrations-appendix.md), [CONTEXT.md](../../CONTEXT.md), [cursor-tool-connections-deployment.md](../cursor-tool-connections-deployment.md)

---

## Context

Enterprise and PortCo buyers ask about:

1. **HRIS integrations** (handled separately — [hris-portco-integration-playbook.md](../roadmap/hris-portco-integration-playbook.md)).
2. **Agent / AI tool access** to the compliance system of record, often labeled **“MCP integration”** in RFPs.

The repository today ships **Context Sync REST** (`/api/contextsync/*`) — session-bound, tenant opt-in, grants, rate limits, read-only IMS URIs. It does **not** ship a customer-facing **Model Context Protocol (MCP) server**.

Internal **Cursor MCP** connections (Vercel, Neon, Slack) are contributor tooling only and must not appear in customer diligence ([procurement-readiness.md](../procurement-readiness.md) §4).

---

## Decision

Adopt a **hybrid strategy (Options A + B from evaluation)**:

1. **Primary product surface:** Expand **Context Sync REST** as the governed agent interoperability API (documentation, OpenAPI, service identities).
2. **Optional packaging:** Publish a **thin MCP adapter** (`@autonomous-ehs/mcp-server` or equivalent) that exposes Context Sync and selected read-only operations as MCP tools for buyers who explicitly require MCP-compatible agent platforms.
3. **Compliance boundary unchanged:** Regulated IMS **writes** remain on authenticated tRPC procedures and the EHS Console — neither Context Sync nor MCP tools may bypass RBAC or auto-mutate workflow state.

**Reject for v1:**

- **Option C alone (partner-only MCP)** — insufficient for RFPs that require a named vendor MCP story.
- **Native MCP as sole API** — duplicates Context Sync investment and splits governance.

---

## Rationale

| Factor | Context Sync first | Thin MCP adapter | Partner-only MCP |
|--------|-------------------|------------------|------------------|
| Compliance control | Already implemented (session, grants, provenance) | Wraps same gates | Variable quality |
| RFP “MCP” keyword | Needs mapping in sales | Direct match | Depends on SI |
| Maintenance | One REST surface | Small adapter repo | Low vendor cost |
| Unattended agents | Needs service auth (below) | Same | N/A |

Buyers often mean **any governed tool access**, not the MCP wire format. Leading with Context Sync avoids over-promising MCP while staying honest in diligence.

---

## Consequences

### Positive

- Single governance model (RBAC, audit, tenant kill switch) for all agent read paths.
- MCP adapter can ship independently of core app release cadence.
- Clear separation from Cursor internal MCP in procurement docs.

### Negative / tradeoffs

- Sales must **translate** “MCP” → Context Sync in early conversations until adapter ships.
- Two documentation surfaces (REST + MCP tool catalog) require sync discipline.
- Service-agent OAuth adds security review surface.

### Risks

| Risk | Mitigation |
|------|------------|
| MCP adapter bypasses write guards | Adapter only calls Context Sync + explicitly allowlisted read tRPC; no generic SQL |
| Confusion with Cursor MCP | [procurement-integrations-appendix.md](../procurement-integrations-appendix.md) §3 |
| Agent exfiltration at scale | Rate limits, daily read quotas, provenance caps (existing); extend monitoring |

---

## Implementation roadmap

### Phase 1 — Context Sync hardening (core repo)

| Item | Description |
|------|-------------|
| **OpenAPI spec** | Publish `docs/contextsync-openapi.yaml` from existing routes |
| **Service-agent auth** | OAuth2 client credentials or org-scoped API tokens; actor binding `service:{clientId}` with explicit grants |
| **Metrics** | Context Sync request counters on cron metrics scrape |
| **Provenance TTL** | Operational runbook job per [context-sync-provenance.md](../runbooks/context-sync-provenance.md) |

### Phase 2 — Thin MCP adapter (separate package)

| Item | Description |
|------|-------------|
| **Package** | `@autonomous-ehs/mcp-server` — stdio and HTTP transport |
| **Tools (read-only v1)** | `contextsync_list_artifacts`, `contextsync_get_artifact`, `contextsync_explain_permission`, `ims_read_snapshot` (policy revision, controlled document, rag source URIs) |
| **Auth** | User OAuth device flow **or** service token configured in MCP client env |
| **No tools for** | `incident.create`, CAPA status change, approval decide — remain human-in-the-loop |

### Phase 3 — Optional expansions

- MCP resources mirroring `ctx://` URI catalog.
- Read-only tRPC procedures exposed as additional tools (incident summary, CAPA list) with same permission checks as UI.
- Partner certification program for SI-built MCP servers using Context Sync.

---

## Alternatives considered

### B. Context Sync only (no MCP)

**Pros:** Lowest maintenance.  
**Cons:** Loses RFP checkbox for buyers mandating MCP by name.  
**Why not chosen alone:** Adapter cost is medium and decoupled; hybrid preserves optionality.

### C. Partner-built MCP only

**Pros:** Zero first-party MCP maintenance.  
**Cons:** Weak vendor story; inconsistent security posture across SIs.  
**Why not chosen alone:** Enterprise PortCo diligence expects vendor-owned agent access narrative.

### D. Full MCP server replacing Context Sync

**Pros:** Single protocol for agents.  
**Cons:** Rewrites proven REST layer; harder HTTP caching and enterprise API gateway integration.  
**Rejected.**

---

## Diligence talk track

> “Autonomous EHS provides **Context Sync**, a governed REST API for agent and IDE read access to compliance context, with tenant opt-in, scoped grants, provenance, and rate limits. We do **not** embed LLM-owned workflow transitions. For customers requiring **Model Context Protocol**, we provide an optional **MCP adapter** that wraps Context Sync — Cursor IDE MCP integrations are **internal engineering tools**, not customer product features.”

---

## References

- Context Sync routes: [`src/app/api/contextsync/`](../../src/app/api/contextsync/)
- Authorization: [`src/server/services/contextSync/authorize.ts`](../../src/server/services/contextSync/authorize.ts)
- Protocol admin tRPC: [`src/server/trpc/routers/contextSyncProtocol.ts`](../../src/server/trpc/routers/contextSyncProtocol.ts)
- AI boundary: [ai-governed-intake.md](../ai-governed-intake.md)
- CTO evaluation plan: corrective actions matrix (P0–P3)

---

## Review schedule

Revisit this ADR when:

- First PortCo RFP mandates MCP by name with hard delivery date.
- Service-agent auth ships and unattended agent use cases are validated with counsel.
- MCP spec or enterprise gateway patterns materially change (annual review).
