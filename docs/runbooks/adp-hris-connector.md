# ADP Workforce Now HRIS connector runbook (iPaaS)

**Audience:** PortCo IT / integration operators  
**Fixture:** `tests/fixtures/integration/adp-hris-sync.json`

## Field mapping

| ADP | EHS envelope |
|-----|--------------|
| associateOID | externalWorkerId |
| businessCommunication.emails | workerEmail |
| workAssignments.homeWorkLocation | siteId (mapped) |
| workerStatus.statusCode | employmentStatus |

## Staging verification

1. Apply ADP preset on `/dashboard/integrations`.
2. Replay ADP fixture against `/api/integration/inbound`.
3. Verify audit log action `integration.hris_membership_sync` or `integration.hris_membership_provision`.

## Failure modes

See [workday-hris-connector.md](./workday-hris-connector.md) — identical inbound auth and site mapping patterns apply.
