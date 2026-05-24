# BambooHR HRIS connector runbook (iPaaS)

**Audience:** Mid-market PortCos (BambooHR + Okta)  
**Fixture:** `tests/fixtures/integration/bamboohr-hris-sync.json`

## Typical architecture

- **Okta SCIM** → `/api/scim/v2/Users` + `/api/scim/v2/Groups` for joiner/leaver and group→role
- **BambooHR webhook** → `hris_membership_sync` for site/department/manager updates

## Field mapping

| BambooHR | EHS envelope |
|----------|--------------|
| id | externalWorkerId |
| workEmail | workerEmail |
| location | siteId (mapped) |
| department | department |
| jobTitle | jobTitle |
| supervisorEEmail | managerEmail |

## Staging verification

1. Apply BambooHR preset (includes sample payload in connector presets).
2. POST `bamboohr-hris-sync.json` to inbound webhook.
3. Confirm membership department/job title updated for existing member, or provisioned for new email.

## Daily reconcile

POST nightly `roster_snapshot` with full active worker list; monitor **Roster drift** widget on `/dashboard/integrations`.
