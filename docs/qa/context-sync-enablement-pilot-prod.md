# Context Sync enablement confirmation — pilot / production

**Purpose:** Gate evidence for corporate **R-009 / G-R-009**. Context Sync REST (`/api/contextsync/*`) and `contextSyncProtocol` stay **opt-in per organization**. This record confirms enablement and grants were explicit before a pilot or production tenant uses agent/IDE integrations.

**Related:** [`docs/adr/0001-mcp-context-sync-strategy.md`](../adr/0001-mcp-context-sync-strategy.md), [`docs/runbooks/context-sync-provenance.md`](../runbooks/context-sync-provenance.md), [`docs/adr/ADR-S-004-threat-model-demo-env.md`](../adr/ADR-S-004-threat-model-demo-env.md).

**Not legal advice.** Enablement does not authorize regulated IMS writes via agents; writes remain on permissioned tRPC.

---

## Preconditions (fail closed)

| Control | Expected |
|---------|----------|
| `organization.context_sync_enabled` | Default **false** for new orgs; set **true** only via org-admin `organization.updateContextSyncEnabled` (audited) |
| Session actor binding | REST requires Better Auth session; `X-Actor-Id` must equal `human:{session.user.id}` (403 `actor_mismatch` otherwise) |
| Agent class | `X-Agent-Class` honored only with org-bound claim rows from `contextSyncProtocol.agentClassClaimCreate` |
| Rate limit | Non-dev deploy class has Upstash (`UPSTASH_REDIS_REST_*`) or explicit `RATE_LIMIT_DISABLED=true` bridge |
| Demo | `DEMO_MODE` / `NEXT_PUBLIC_DEMO_MODE` unset (or `DEMO_ALLOW_PRODUCTION=true` with documented exception) |

Smoke oracle (anonymous gate): `tests/e2e/smoke/contextsync-rest-auth.spec.ts` — expects **401** `sign_in_required` without a session.

---

## Confirmation checklist

Copy this section per tenant. Mark each item `[x]` only with evidence (ticket ID, audit_log row, or screenshot path).

### Tenant identity

| Field | Value |
|-------|-------|
| Organization name | _TBD_ |
| Organization UUID | _TBD_ |
| Environment | ☐ staging / pilot ☐ production |
| Confirmation date (UTC) | _TBD_ |
| Confirmed by (name / role) | _TBD_ |
| Ticket / change record | _TBD_ |

### Enablement

- [ ] Org admin toggled **Context Sync enabled** in EHS Console (Integrations / org settings) **or** equivalent audited mutation
- [ ] `audit_log` shows `organization.context_sync_enabled.update` with `enabled: true` for this org
- [ ] No blanket enablement across unrelated orgs in the same database

### Grants and agent class

- [ ] Scoped grants reviewed (default-deny when grants exist for the actor/agent class)
- [ ] Agent-class claims listed; unused / spoofable classes removed
- [ ] Anonymous + spoofed `X-Agent-Class` still receive **401** without session (adversarial / smoke)

### Ops readiness

- [ ] Upstash (or approved rate-limit backend) configured for this deploy class
- [ ] Optional `CONTEXT_SYNC_ORG_DAILY_READ_LIMIT` / provenance caps reviewed
- [ ] Provenance retention / legal-hold note acknowledged (corporate **D-011** — claim expansion blocked until resolved)

### Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Org admin | | | ☐ confirmed |
| EHS / platform owner | | | ☐ confirmed |

**Status for this artifact template:** ready for pilot/prod fill-in (no tenant enabled by this ADR alone).
