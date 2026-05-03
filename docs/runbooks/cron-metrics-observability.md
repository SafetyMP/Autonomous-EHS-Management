# Cron metrics observability runbook

This runbook describes how to **scrape** and **alert** on platform cron execution using [`GET /api/cron/metrics`](../../src/app/api/cron/metrics/route.ts). Data rows are persisted in Postgres (`cron_job_run`) on each successful or failed cron handler run.

## Authentication

The endpoint requires the **same shared secret** as cron jobs:

```http
GET /api/cron/metrics HTTP/1.1
Host: <your-app-host>
Authorization: Bearer <CRON_SECRET>
```

**Operational rules**

- Treat `CRON_SECRET` like a bearer token for automation: rotate with your cron jobs, restrict to scraping/cron infra only.
- **Never** print full bearer tokens in logs, CI output, or support tickets.

## Response formats

| Query | Meaning |
|--------|---------|
| (default) | Prometheus text exposition (`text/plain`). |
| `?format=json` | JSON rollup for debugging (`windowHours`, `rollup`, `latest`). |
| `?windowHours=168` | Rolling window length (1–8760 hours) for `*_in_window` series. |

## Emitted metric families (Prometheus body)

Interpretation aligns with naming in [`src/server/cron/cronMetrics/prometheusFormat.ts`](../../src/server/cron/cronMetrics/prometheusFormat.ts):

| Metric | Type (exposition) | Use |
|--------|-------------------|-----|
| `ehs_cron_job_runs_success_in_window{job="<key>"}` | gauge | Completed successful runs in the rolling window |
| `ehs_cron_job_runs_error_in_window{job="<key>"}` | gauge | Failed runs in the rolling window |
| `ehs_cron_job_last_run_timestamp_seconds{job}` | gauge | Unix seconds of latest **start** (0 if no history) |
| `ehs_cron_job_last_run_duration_ms{job}` | gauge | Duration of latest run |
| `ehs_cron_job_last_run_ok{job}` | gauge | `1` if latest run succeeded, else `0` |
| `ehs_cron_metrics_window_hours` | gauge | Window used for `_in_window` series on this scrape |

Known `job` label values match [`CRON_JOB_KEYS`](../../src/server/cron/recordCronRun.ts): `reminders`, `data-retention`.

## Vercel vs Kubernetes / self-hosted

- **Vercel:** Cron invocations hit your **deployed URL** (`vercel.ts` schedules remind + data-retention). Metrics scrape does **not** run on Vercel’s cron schedule; configure an **external** scraper or synthetic check (collector, Grafana Agent, SaaS uptime with custom header—only if secrets can be injected safely).

- **Kubernetes:** Run Prometheus / Victoria Metrics / Datadog Agent with scrape config targeting the **`ehs-web` Service** (`ClusterIP`). Use `authorization` bearer from External Secrets/Kubernetes Secret; see patterns in [`deploy/k8s/`](../../deploy/k8s/) and the DevOps skill ([`.cursor/skills/devops-sre/SKILL.md`](../../.cursor/skills/devops-sre/SKILL.md)).

## SLO framing (concrete)

Daily crons (`reminders` `0 8 * * *`, `data-retention` `30 9 * * *` per [`vercel.ts`](../../vercel.ts)) need **at least one successful execution per intended day**, not a 99.9% request SLO on the metrics route. Treat the following as **starting objectives**; tune with your error budget.

| Objective | Target | Primary signal | Notes |
|-----------|--------|----------------|--------|
| Reminders job health | ≥1 success / 36h rolling | `ehs_cron_job_runs_success_in_window{job="reminders"}` with `windowHours` ≥ 48 | Wider window absorbs missed-day holidays if you disable cron. |
| Data retention job health | ≥1 success / 36h | `ehs_cron_job_runs_success_in_window{job="data-retention"}` | Pair with anonymize/delete outcomes from app logs / `data_lifecycle_run`. |
| Error budget (failures) | ≤ N failures / 7d | `ehs_cron_job_runs_error_in_window` | Set N from how many failed runs you can tolerate before manual triage. |
| Stale success signal | Scrape age &lt; 10m | Prometheus `scrape_duration_seconds` / `up` for `ehs_cron_metrics` | If scrapes stop, `_in_window` gauges go flat—alert on target `up==0`. |

**Window vs scrape interval:** `ehs_cron_metrics_window_hours` reflects the **query** window passed to the app (default in code), not Prometheus `scrape_interval`. Use `windowHours=168` (or longer) on the scrape URL if you want week-scale rollups consistent with alert lookbacks.

## Example PromQL (alerts)

For a **ready-to-merge `PrometheusRule` manifest** (same expressions, with `for:` / annotations), see [`deploy/k8s/prometheus-rules-cron.example.yml`](../../deploy/k8s/prometheus-rules-cron.example.yml). Copy it into your kube-prometheus-stack release or adjust namespace/labels to match your operator selectors.

Tune windows and thresholds to your error budget policy.

1. **No successful runs when the window expects daily execution** (gauge is count-in-window from DB, not a rate series—compare to 0):

   ```promql
   ehs_cron_job_runs_success_in_window{job="reminders"} == 0
   ```

   Fire only when the job **should** have run (e.g. weekdays) and when `ehs_cron_metrics_window_hours` × scrape coverage still implies “we should have seen a success.” Prefer combining with **`ehs_cron_job_last_run_timestamp_seconds`** staleness:

   ```promql
   (time() - ehs_cron_job_last_run_timestamp_seconds{job="reminders"}) > 172800
   and ehs_cron_job_last_run_ok{job="reminders"} == 0
   ```

2. **Failure budget**

   ```promql
   ehs_cron_job_runs_error_in_window{job="data-retention"} > 0
   ```

   Escalate when above N by recording a derived metric in Prometheus (see recording rules below).

3. **Latest run health**

   Alert when `ehs_cron_job_last_run_ok{job="reminders"} == 0` **and** the last timestamp is recent (handler failed on last invocation).

Prefer pairing metrics with **`CRON_FAILURE_WEBHOOK_URL`** ([`notifyCronFailure`](../../src/server/cron/notifyOnFailure.ts)) for immediate push alerts on exceptions.

## Prometheus recording rules (optional)

Paste into a `RuleGroup` beside your other platform rules—adjust thresholds.

```yaml
groups:
  - name: ehs_cron_slo_helpers
    interval: 60s
    rules:
      - record: job:ehs_cron_errors_in_window:sum
        expr: sum by (job) (ehs_cron_job_runs_error_in_window)
      - record: job:ehs_cron_success_in_window:sum
        expr: sum by (job) (ehs_cron_job_runs_success_in_window)
```

On successful auth, if the database query fails, the handler returns **503** `{ "error": "metrics_unavailable" }` after logging `cron.metrics.query_failed` (distinct from **401** Unauthorized).

## Manual smoke

```bash
curl -sfS -H "Authorization: Bearer $CRON_SECRET" \
  "$NEXT_PUBLIC_APP_URL/api/cron/metrics" | head
```

Replace `NEXT_PUBLIC_APP_URL` with staging/prod origin.

**Playwright:** [`tests/e2e/smoke/cron-metrics.spec.ts`](../../tests/e2e/smoke/cron-metrics.spec.ts) asserts 401 always; the Prometheus body assertion runs in **GitHub Actions** (or with `FORCE_CRON_METRICS_SMOKE=1` when local Postgres matches `.env.ci`). Optional deployed probe: [`.github/workflows/cron-metrics-probe.yml`](../../.github/workflows/cron-metrics-probe.yml) (**workflow_dispatch**).
