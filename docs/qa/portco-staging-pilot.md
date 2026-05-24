# PortCo staging pilot checklist

Operational checklist for a **staging** PortCo tenant before production promotion. Maps to playbook §8 in [hris-portco-integration-playbook.md](../roadmap/hris-portco-integration-playbook.md).

Automated fixture validation: `npm run portco:pilot-verify` (local). Optional live staging POST when env vars are set (see below).

## Prerequisites

| Variable / setting | Purpose |
|--------------------|---------|
| `DATABASE_URL` | Migrated Postgres (Neon staging) |
| `INTEGRATION_INBOUND_SECRET` | Bearer for `POST /api/integration/inbound` |
| `PG_BOSS_ENABLED=true` | Async HRIS membership ingest (`202` + worker) |
| `CRON_SECRET` | Vercel cron auth for roster reconcile |
| Job worker | `npm run job:worker` on EKS/Vercel worker or long-running host |
| Operational webhooks | `/dashboard/integrations` → subscribe to `integration.processing_failed` |

## Discover

- [ ] HRIS vendor documented (Workday / ADP / BambooHR runbook selected)
- [ ] IdP (Okta, Entra, Ping) SSO app registered
- [ ] iPaaS recipe owner assigned (Workato / Boomi / custom)
- [ ] Legal entity → EHS `organizationId` mapping table agreed
- [ ] HRIS location codes → EHS `site.id` lookup maintained in iPaaS

## Configure

- [ ] OIDC JIT claim rules **or** SCIM bearer token + group→role mappings on `/dashboard/integrations`
- [ ] EHS sites created with stable UUIDs for location mapping
- [ ] RBAC role templates per PortCo function (supervisor, worker, org admin)
- [ ] `INTEGRATION_INBOUND_SECRET` stored in iPaaS vault (never in git)
- [ ] Connector preset applied (Workday / ADP / BambooHR / contractor) for operator reference

## Integrate

- [ ] Run `npm run portco:pilot-verify` — all fixtures pass Zod validation
- [ ] iPaaS recipe tested in staging with synthetic workers (see `tests/fixtures/integration/`)
- [ ] Idempotency keys verified on replay (same `idempotencyKey` → cached response)
- [ ] Operational webhook receives test `integration.processing_failed` payload
- [ ] If async HRIS: confirm `202` responses and worker applies events

## Verify (JML scenarios)

- [ ] **Joiner:** HRIS webhook or SCIM creates user + membership + correct site
- [ ] **Mover:** site/department change propagates; audit log entry present
- [ ] **Leaver:** `employmentStatus: terminated` or SCIM deactivate → `deprovisioned` + sessions revoked
- [ ] **LMS:** `training_completion` upserts `training_record` when `externalWorkerId` matches
- [ ] **Contractor:** `hris_contractor_sync` upserts `external_party`
- [ ] **Roster:** `roster_snapshot` ingest + drift widget; nightly cron or manual reconcile
- [ ] `/dashboard/integrations` shows applied events; failed events reprocess works for HRIS/contractor

## Operate

- [ ] Weekly failed-event review process assigned
- [ ] Quarterly location mapping audit scheduled
- [ ] Warehouse NDJSON export tested if analytics required
- [ ] Production promote: `npm run db:migrate` on Neon prod + Vercel deploy from `main`

## Optional live staging POST

Set these env vars and re-run verify to POST fixtures to a running staging app:

```bash
export PORTCO_PILOT_BASE_URL="https://your-staging.vercel.app"
export PORTCO_PILOT_ORG_ID="<staging-org-uuid>"
export INTEGRATION_INBOUND_SECRET="<secret>"
npm run portco:pilot-verify -- --live
```

## Runbooks

- [Workday HRIS connector](../runbooks/workday-hris-connector.md)
- [ADP HRIS connector](../runbooks/adp-hris-connector.md)
- [BambooHR HRIS connector](../runbooks/bamboohr-hris-connector.md)
