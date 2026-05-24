# PortCo pilot metrics worksheet

Fill after a **90-day Tier 1 pilot** ([portco-tier1-pilot-scope.md](../qa/portco-tier1-pilot-scope.md)). Pair with command-center **Export KPI CSV** on `/dashboard` and integration/contractor dashboards.

**Not legal advice.** Obtain marketing/counsel approval before external publication.

---

## Pilot metadata

| Field | Value |
|-------|--------|
| PortCo / anonymized label | |
| Site(s) in scope | |
| Pilot start | |
| Pilot end | |
| Legacy tool (parallel run) | |
| iPaaS vendor (Workato/Boomi/custom) | |

---

## ROI metrics (from [procurement-readiness.md](../procurement-readiness.md) §6)

| Metric | Baseline | After pilot | Delta | Notes |
|--------|----------|-------------|-------|-------|
| Median incident closeout (days) | | | | From `incident` dates |
| CAPA cycle time (days) | | | | `pending_approval` → `verified` |
| Contractor credential clearance (days) | | | | Renewal queue → active COI |
| Audit preparation hours (est.) | | | | Internal audit / ISO evidence |
| Failed integration events (count) | | | | `/dashboard/integrations` |
| Contractor renewals attention (30d) | | | | Command center KPI |

---

## Technical health checklist

- [ ] `npm run portco:pilot-verify` green in staging
- [ ] HRIS JML scenarios passed ([portco-staging-pilot.md](../qa/portco-staging-pilot.md))
- [ ] UAT sign-off completed ([portco-uat-signoff-record.md](../qa/portco-uat-signoff-record.md))
- [ ] Operational webhooks deliver to Slack/Teams (test send)
- [ ] Command center KPI CSV exported and archived

---

## Narrative (2–4 sentences)

What changed day-to-day for supervisors and EHS managers:

---

## Approval

| Role | Name | Date |
|------|------|------|
| EHS program owner | | |
| IT / integration | | |

Store redacted artifacts under `docs/case-studies/assets/` per [PUBLICATION.md](./PUBLICATION.md).
