# Background jobs (pg-boss)

This repo can move work off the HTTP request thread using **[pg-boss](https://github.com/timgit/pg-boss)** on PostgreSQL. Typed job names live in [`src/server/jobs/types.ts`](../src/server/jobs/types.ts); producers call [`getJobQueue()`](../src/server/jobs/queue.ts).

## Environment

| Variable | Purpose |
|----------|---------|
| `PG_BOSS_ENABLED` | Set to `true` to **enqueue** via pg-boss (API/cron path). Requires a **worker** process. |
| `PG_BOSS_SCHEMA` | Optional non-default schema for pg-boss metadata tables (default `pgboss`). |
| `JOB_QUEUE_ENABLED` | When pg-boss is **off**, set to `true` for **dev-only logging** of enqueue calls (no durable queue). |

`DATABASE_URL` must be reachable from both the Next.js app and the worker (standard Postgres protocol; use `pg` pool, not edge-only drivers on the worker).

## Producer: integration replay

When `PG_BOSS_ENABLED=true`, [`integration.reprocessFailedEvent`](../src/server/trpc/routers/integration.ts) **enqueues** `integration.reprocessFailed` instead of applying inline. An `audit_log` row is written with action `integration.reprocess_queued`.

## Producer: HRIS inbound (async)

When `PG_BOSS_ENABLED=true`, [`POST /api/integration/inbound`](../src/app/api/integration/inbound/route.ts) with `kind: "hris_membership_sync"` **returns `202 Accepted`** and enqueues `integration.inboundHris` (optional connector `idempotencyKey` becomes a **singletonKey** so duplicate deliveries collapse while a job is in flight). The worker runs the same [`processHrisMembershipSyncInbound`](../src/server/services/integrationInboundDispatch.ts) path as the synchronous webhook and, when an idempotency key is present, writes the **`200` / `422`** replay cache (`integration_inbound_idempotency`) after completion.

## Worker (required when pg-boss is on)

Run a **long-lived** Node process (Kubernetes `Deployment`, ECS service, VM)—**not** a Vercel function:

```bash
npm run job:worker
```

The worker script is [`scripts/job-worker.ts`](../scripts/job-worker.ts). It starts pg-boss and registers handlers:

- **`integration.reprocessFailed`** → [`reprocessFailedIntegrationEvent`](../src/server/services/integrationInboundDispatch.ts)
- **`integration.inboundHris`** → [`processHrisMembershipSyncInbound`](../src/server/services/integrationInboundDispatch.ts) (+ idempotency cache when `idempotencyKey` is set on the payload)
- **`dataRetention.runChunk`** → bounded pass of [`runDataRetentionCron`](../src/server/services/dataRetention.ts) with configurable `batchSize` (default **75** in the worker) for draining large retention backlogs without a single long HTTP cron

On first start, pg-boss creates its tables in the target schema.

### Producer: data retention chunk (optional)

Any trusted producer may enqueue `dataRetention.runChunk` with `{ "batchSize": 75 }` (optional) when you want async, smaller retention passes—pair with your SRE playbook; the daily cron may still run the full `200`-row-per-class sweep by default.

## Failure modes

- **No worker:** jobs accumulate in Postgres until TTL; alert on queue depth.
- **Duplicate execution:** handlers should be idempotent or use dedupe keys when you extend producers.
- **Vercel-only hosting:** keep short work on HTTP crons; use a worker for retries, long runs, or integration replay at scale.

## On-call

If enqueue is enabled but the worker is down, **scale the worker to 1+** or **set `PG_BOSS_ENABLED` unset/false** on producers until the backlog is drained—tune per your SRE playbook.
