# Self-host quickstart

Reference deployment for **tenant-owned** Autonomous EHS: Docker image, Kubernetes manifests, scheduled cron HTTP jobs, optional pg-boss worker, and metrics scrape. Same Apache 2.0 application source as managed SaaS—your Postgres bill and cluster ops stay under your account.

**Related:** [open-source-tco.md](./open-source-tco.md), [README Deploy](../README.md#deploy), [JOB_QUEUE.md](./JOB_QUEUE.md), [runbooks/cron-metrics-observability.md](./runbooks/cron-metrics-observability.md), [REPO_SETUP.md](../REPO_SETUP.md).

---

## Prerequisites

- **PostgreSQL 15+** with migrations applied (`npm run db:migrate` against your `DATABASE_URL`).
- **Secrets** satisfying [`src/lib/env.ts`](../src/lib/env.ts): at minimum `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ chars), `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`.
- **Production:** disable all demo flags (`DEMO_MODE`, `NEXT_PUBLIC_DEMO_MODE`, etc.).

---

## 1. Build the container image

The root [`Dockerfile`](../Dockerfile) produces a **Next.js standalone** image (Node 22+).

```bash
docker build -t ehs-web:local .
```

Smoke-run (replace secrets; use your secret manager in production):

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://USER:PASS@HOST:5432/DBNAME" \
  -e DATABASE_USE_PG=1 \
  -e BETTER_AUTH_SECRET="CHANGE_ME_MIN_32_CHAR_SECRET_STRING!!" \
  -e BETTER_AUTH_URL="http://localhost:3000" \
  -e NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  ehs-web:local
```

Health: `GET /api/health` → `{ ok, database }`.

CI publishes **`ghcr.io/<owner>/<repo>/ehs-web`** on pushes to `main` when app or Docker paths change (see [`.github/workflows/docker-publish.yml`](../.github/workflows/docker-publish.yml)).

---

## 2. Kubernetes rollout

Base manifests live under [`deploy/k8s/`](../deploy/k8s/).

| Manifest | Purpose |
|----------|---------|
| [`namespace.yaml`](../deploy/k8s/namespace.yaml) | Target namespace (e.g. `ehs-prod`) |
| [`deployment.yaml`](../deploy/k8s/deployment.yaml) | Web `Deployment` (port 3000) |
| [`service.yaml`](../deploy/k8s/service.yaml) | ClusterIP `ehs-web:3000` |
| [`ingress.yaml`](../deploy/k8s/ingress.yaml) | TLS ingress (adjust host/TLS for your cluster) |
| [`secret.example.yaml`](../deploy/k8s/secret.example.yaml) | **Template only** — create `ehs-app-secrets` in-cluster |
| [`kustomization.yaml`](../deploy/k8s/kustomization.yaml) | Image tag rewrite for promotions |

**Before apply:** create the app secret (never commit real values):

```bash
kubectl -n ehs-prod create secret generic ehs-app-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=BETTER_AUTH_SECRET='...' \
  --from-literal=BETTER_AUTH_URL='https://app.example.com' \
  --from-literal=NEXT_PUBLIC_APP_URL='https://app.example.com' \
  --from-literal=CRON_SECRET='...'
```

Apply (after reviewing namespace and image ref):

```bash
kubectl apply -k deploy/k8s/
```

Run migrations **once** per schema version (Job, CI step, or operator runbook)—the web container does not auto-migrate on boot:

```bash
npm run db:migrate   # with DATABASE_URL pointed at the cluster database
```

Link first admin: `SEED_ADMIN_EMAIL=admin@example.com npm run db:seed`.

---

## 3. Cron jobs (Vercel substitute)

On **Vercel**, [`vercel.ts`](../vercel.ts) schedules HTTP cron for reminders and data retention. On **Kubernetes**, use [`deploy/k8s/cronjob-reminders.yaml`](../deploy/k8s/cronjob-reminders.yaml) and [`deploy/k8s/cronjob-data-retention.yaml`](../deploy/k8s/cronjob-data-retention.yaml).

Both curl the web service with:

```http
Authorization: Bearer <CRON_SECRET>
```

| Route | Schedule (UTC, match `vercel.ts`) |
|-------|-----------------------------------|
| `GET /api/cron/reminders` | `0 8 * * *` |
| `GET /api/cron/data-retention` | `30 9 * * *` |

**Metrics scrape (not a CronJob):** configure Prometheus or your collector to **`GET /api/cron/metrics`** with the same bearer token. See [cron-metrics-observability.md](./runbooks/cron-metrics-observability.md) and [`prometheus-scrape-cron-metrics.example.yml`](../deploy/k8s/prometheus-scrape-cron-metrics.example.yml).

---

## 4. Optional pg-boss worker

When **`PG_BOSS_ENABLED=true`** on the web app:

- `POST /api/integration/inbound` with `kind: "hris_membership_sync"` may return **`202 Accepted`** and enqueue async processing.
- `integration.reprocessFailedEvent` queues replay jobs instead of running inline.

You **must** run a long-lived worker (separate from the web pod):

```bash
npm run job:worker
```

In Kubernetes, add a second `Deployment` using the same image with command `npm run job:worker`, same `DATABASE_URL`, and `PG_BOSS_ENABLED=true`. Details: [JOB_QUEUE.md](./JOB_QUEUE.md).

**Vercel-only hosting:** keep `PG_BOSS_ENABLED` unset unless you operate a worker elsewhere against the same database.

---

## 5. Verify production posture

| Check | Command / surface |
|-------|-------------------|
| App health | `GET /api/health` |
| Auth gate | Unauthenticated `/dashboard` → sign-in redirect |
| Cron auth | CronJob or curl with wrong bearer → **401** |
| Demo disabled | No `DEMO_MODE` / `NEXT_PUBLIC_DEMO_MODE` in prod env |
| CI parity | `npm run verify` before promoting image tag |

---

## 6. Integration inbound (HRIS / LMS)

External systems POST to **`POST /api/integration/inbound`** with bearer **`INTEGRATION_INBOUND_SECRET`**. Envelope shapes and versioning: [integration-inbound-contract.md](./integration-inbound-contract.md).

---

## Terraform / EKS starter

Optional VPC + EKS in [`infra/terraform/`](../infra/terraform/). Promotion and OIDC deploy paths: [REPO_SETUP.md](../REPO_SETUP.md), [`.github/workflows/cd-promote-production.yml`](../.github/workflows/cd-promote-production.yml).
