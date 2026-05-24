# Workday HRIS connector runbook (iPaaS)

**Audience:** PortCo IT / integration operators  
**Related:** [hris-portco-integration-playbook.md](../roadmap/hris-portco-integration-playbook.md), preset `workday` in `src/lib/integration/connectorPresets.ts`

## Prerequisites

- EHS org UUID and site UUIDs mapped to Workday locations
- `INTEGRATION_INBOUND_SECRET` in iPaaS vault
- SCIM bearer token rotated on `/dashboard/integrations` (PortCo identity panel) for joiners
- Optional: Okta/Entra SSO + OIDC JIT claim rules for multi-org portfolios

## Field mapping

| Workday | EHS `hris_membership_sync` |
|---------|---------------------------|
| Worker_Email | workerEmail |
| Worker_ID | externalWorkerId |
| Location_ID | siteId (via lookup CSV) |
| Supervisory_Organization | department |
| Job_Profile | jobTitle |
| Manager_Email | managerEmail |
| Active_Status | employmentStatus |

## Staging verification

1. Apply Workday preset on `/dashboard/integrations` → Connector field mapping.
2. POST fixture `tests/fixtures/integration/workday-hris-sync.json` to `/api/integration/inbound` with bearer secret.
3. Confirm `integration_event` status `applied` and membership fields updated.
4. POST a new worker email — confirm user + membership provisioned (HRIS v2 joiner path).
5. POST `employmentStatus: "terminated"` — confirm lifecycle `deprovisioned` and sessions revoked.

## Failure modes

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| 401 Unauthorized | Wrong inbound secret | Rotate secret in Vercel/env + iPaaS |
| Invalid siteId | Location not mapped | Fix site UUID or iPaaS lookup table |
| Role not found | SCIM default role slug missing in org | Seed role or update SCIM config |
| Drift persists | Snapshot not ingested | POST `roster_snapshot` batch nightly |

## Production promote

- Enable operational webhook `integration.processing_failed`
- Schedule nightly `roster_snapshot` + pg-boss `integration.reconcileRoster` worker (`npm run job:worker`)
