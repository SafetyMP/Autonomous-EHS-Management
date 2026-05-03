# Context Sync — provenance table operations

[`context_sync_provenance`](../../src/server/db/schema.ts) records **`read`** and **`write`** touches against Context Sync artifact URIs (including IMS-linked **`ctx://…/ims/…`** snapshots on read). Rows include `organization_id`, `actor_id`, `artifact_uri`, `version_touched`, and timestamps.

## Why it matters

- **Audit posture:** complements transactional **`audit_log`** on mutations; provenance emphasizes *who accessed which protocol view*, which matters when IDE agents replay ISO-adjacent context blobs.
- **Capacity:** reads create rows; high-traffic orgs or scripted polling can increase Postgres volume and index footprint (`context_sync_provenance_org_created_idx`, `context_sync_provenance_artifact_idx` in schema).

## Backlog — no bundled purge job

1. Agree **retention / archival policy** per tenant with counsel where reads are regulated (coordinate with [COMPLIANCE.md](../../COMPLIANCE.md)).
2. If bulk deletes are approved, ship a guarded cron or worker job that prunes aged rows **subject to legal hold**, and summarizes actions in **`audit_log`** similar to credential-expiry housekeeping.

Until automatic retention exists, monitor **`context_sync_provenance` cardinality** alongside normal PostgreSQL monitoring.

## API caps (optional env)

REST handlers may enforce:

- **`CONTEXT_SYNC_ORG_DAILY_READ_LIMIT`** — per-org read budget for Context Sync routes for the **UTC calendar day** (Upstash `INCR` when Upstash URL/token are configured). Omit or set `0` to disable the gate.
- **`CONTEXT_SYNC_PROVENANCE_MAX_LIMIT`** — maximum provenance/history rows returned in a single response (default **200** in code when unset).

See [`src/lib/env.ts`](../../src/lib/env.ts) and [`src/server/services/contextSync/dailyReadQuota.ts`](../../src/server/services/contextSync/dailyReadQuota.ts). The **cron metrics** scrape can expose `context_sync_org_daily_read_limit` for dashboards (see [`docs/runbooks/cron-metrics-observability.md`](./cron-metrics-observability.md)).

## Capacity signals (operators)

Run against your analytics DB user (read-only is fine):

```sql
-- Total provenance rows (all tenants)
SELECT count(*) AS context_sync_provenance_total FROM context_sync_provenance;

-- Top tenants by recent protocol traffic (rolling 7 days)
SELECT organization_id, count(*) AS touches_last_7d
FROM context_sync_provenance
WHERE created_at >= now() - interval '7 days'
GROUP BY organization_id
ORDER BY touches_last_7d DESC
LIMIT 25;

-- Orgs with Context Sync capability currently off (no new protocol provenance from REST once disabled)
SELECT id, name, context_sync_enabled FROM organization WHERE context_sync_enabled = false;
```

Correlate growth with **`organization.context_sync_enabled`** toggles and incident/legal-hold windows before approving purge jobs.
