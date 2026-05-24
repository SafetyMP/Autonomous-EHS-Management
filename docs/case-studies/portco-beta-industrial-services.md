# PortCo pilot — Beta Industrial Services (anonymized)

**Site / scope:** Multi-site industrial services PortCo (3 plants) — HRIS sync + incident programme

**Duration:** 2026-01-01 – 2026-04-30 (16 weeks)

## Baseline

| Metric | Before |
|--------|--------|
| Median incident closeout (days) | 28 |
| CAPA cycle (days) | 45 |
| Contractor onboarding days (manual COI chase) | 12 |

## Intervention

- **Live date:** 2026-01-20 with Workday → iPaaS → HRIS v2 inbound webhook
- **Modules used:** Incidents, observations, integrations event log, SCIM provisioning (staging)
- **Training:** Plant EHS leads; IT operated connector mapping presets on `/dashboard/integrations`

## Outcomes

| Metric | After | Delta |
|--------|-------|-------|
| Median incident closeout | 17 days | −39% |
| CAPA cycle | 29 days | −36% |
| Contractor onboarding days | 7 | −42% |

## Narrative

HRIS site updates for existing members reduced wrong-site incident routing. Contractor credential renewal queue gave security a single roster for expiring COI instead of spreadsheet tabs per vendor.

## Evidence

- Integration NDJSON export used for PE operating partner quarterly review
- **Not legal advice:** confirm HRIS/PII wording with counsel before external use.
