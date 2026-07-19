# Retention record-class inventory

**Not legal advice.** Policy `minimum_years` and actions are counsel-defined. This inventory only states what the **data-retention cron** processes versus classes that exist for **policy / UI configuration only**.

Enum source: `data_retention_record_class` in [`src/server/db/schema.ts`](../../src/server/db/schema.ts). Cron implementation: [`src/server/services/dataRetention.ts`](../../src/server/services/dataRetention.ts) (`runDataRetentionCron`).

## Cron-covered classes

Lifecycle automation (anonymize or delete past `retain_until`, when `legal_hold = false` and not already anonymized) runs for these policy classes:

| `record_class` | Entity rows processed | Delete vs anonymize |
|----------------|----------------------|---------------------|
| `incident_general` | `incident` (+ related injury sidecar cleared on anonymize) | Delete only if org policy action is `delete`; else anonymize |
| `safety_observation_program` | `safety_observation` | Same pattern |
| `work_permit_program` | `work_permit` | Same pattern |
| `environmental_regulatory_permit_program` | `environmental_regulatory_permit` | Same pattern |
| `risk_assessment_program` | `risk_assessment` (+ steps deleted on anonymize) | Same pattern |

**Legal hold:** rows with `legal_hold = true` are skipped by the cron. Rows without `retain_until` are skipped until policy defaults or an authorized override sets a date.

Schedule: `GET /api/cron/data-retention` (see [`vercel.ts`](../../vercel.ts) / K8s CronJob). Metrics job key: `data-retention` ([`CRON_JOB_KEYS`](../../src/server/cron/recordCronRun.ts)).

## Policy-only classes (no cron lifecycle pass)

These enum values may appear on `data_retention_policy` rows for counseling/UI, but **`runDataRetentionCron` does not process entity tables for them**:

| `record_class` | Notes |
|----------------|--------|
| `osha_record` | Policy / register semantics only; OSHA sidecar lifecycle is not a separate cron class pass |
| `gdpr_personal_data` | Policy marker for counsel timelines; no automated cross-table erasure |
| `controlled_document` | Document retention is not driven by this cron path |

Do **not** imply that configuring a policy-only class enables automated purge.

## Tenant teardown (mandatory ops note)

Before destroying a tenant database or org:

1. Export counsel-approved archives for records that must outlive the tenant.
2. Confirm legal holds and open DSARs ([`docs/DSAR_PROCESS.md`](../DSAR_PROCESS.md)).
3. Treat object-store / attachment blobs as an **operator** responsibility ([`COMPLIANCE.md`](../../COMPLIANCE.md)); app metadata delete is not a full media wipe guarantee.

## Related

- Retention UI: `/dashboard/retention`
- Cron observability: [`docs/runbooks/cron-metrics-observability.md`](../runbooks/cron-metrics-observability.md)
- ADR-S-005: [`docs/adr/ADR-S-005-platform-ops-data-governance.md`](../adr/ADR-S-005-platform-ops-data-governance.md)
