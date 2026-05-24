# PortCo pilot — Gamma contractor compliance wedge (anonymized)

> **GTM note:** Synthetic illustrative metrics for procurement conversations. Replace per [PUBLICATION.md](./PUBLICATION.md) before external use.

**Site / scope:** One chemical processing site — contractor & visitor credential programme only

**Duration:** 2025-09-01 – 2025-12-15 (15 weeks)

## Baseline

| Metric | Before |
|--------|--------|
| Contractor onboarding days | 14 |
| Expired COI on site (spot checks) | ~8% of active vendors |
| Audit prep hours (contractor evidence) | 40 / quarter |

## Intervention

- **Live date:** 2025-09-22 — `/dashboard/contractors` renewal queue + operational webhooks to Teams
- **Modules used:** External parties, credentials, reminders cron, operational webhooks
- **Training:** Site admin + gate security; no full IMS cutover

## Outcomes

| Metric | After | Delta |
|--------|-------|-------|
| Contractor onboarding days | 6 | −57% |
| Expired COI on site | &lt;2% | −75% rel. |
| Audit prep hours | 18 / quarter | −55% |

## Narrative

The renewal queue became the daily stand-up list for vendor compliance. Webhook alerts for bulk credential expiry replaced manual calendar reminders.

## Evidence

- Contractor portfolio summary tiles on `/dashboard/contractors`
- **Not legal advice:** gate access policy remains customer-owned; product tracks evidence pointers only.
