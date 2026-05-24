# PortCo pilot — Alpha Manufacturing (anonymized)

> **GTM note:** Synthetic illustrative metrics for procurement conversations. Replace with approved customer data and screenshots in `docs/case-studies/assets/` before external publication.

**Site / scope:** Single plant, Midwest US — incident → CAPA → closure evidence

**Duration:** 2025-11-01 – 2026-02-28 (16 weeks)

## Baseline

| Metric | Before |
|--------|--------|
| Median incident closeout (days) | 34 |
| CAPA cycle (days) | 52 |
| Audit prep hours (est.) | 120 / quarter |

## Intervention

- **Live date:** 2025-11-15 on self-hosted Autonomous EHS (Apache 2.0, tenant Postgres)
- **Modules used:** Incidents, CAPA, approvals, audit trail export, contractor credentials
- **Training:** 2 desk sessions (EHS + supervisors); field observation intake via **mobile web** (no native app). **Offline outbox** used only when tenant enabled `NEXT_PUBLIC_FIELD_OUTBOX=1`—see [offline-field-outbox.md](../offline-field-outbox.md).

## Outcomes

| Metric | After | Delta |
|--------|-------|-------|
| Median incident closeout | 19 days | −44% |
| CAPA cycle | 31 days | −40% |
| Audit prep hours | 68 / quarter | −43% |

## Narrative

Supervisors stopped chasing CAPA status in email threads; the action queue surfaced overdue approvals within 24 hours of breach. Internal audit sampled `audit_log` CSV exports instead of reconstructing timelines from SharePoint folders.

## Evidence

- Redacted command center and CAPA detail screenshots: `docs/case-studies/assets/` (placeholder — add on marketing approval)
- **Not legal advice:** metrics are illustrative pilot targets for GTM materials; validate with customer data before publication.
