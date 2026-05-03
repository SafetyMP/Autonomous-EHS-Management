# Background jobs (scaffold)

This repo **does not** ship `pg-boss` or a worker process yet. The scaffold under [`src/server/jobs/`](../src/server/jobs/) gives a **typed `enqueue`** API so cron routes or tRPC can later move work off the request thread without large refactors.

## Environment

| Variable | Purpose |
|----------|---------|
| `JOB_QUEUE_ENABLED` | Set to `true` to use the logging dev queue (still no durable queue until pg-boss). |
| `PG_BOSS_SCHEMA` | Reserved for step 2: custom schema name for pg-boss tables (document only today). |

## Step 2: pg-boss (org decision)

1. Add dependency `pg-boss` and ensure PostgreSQL can host its tables (same DB or dedicated).
2. Run schema install per pg-boss docs (usually `boss.start()` migrates).
3. Replace [`getJobQueue()`](../src/server/jobs/queue.ts) with a `PgBoss` adapter that implements `JobQueue`.
4. Run a **long-lived worker** (Kubernetes `Deployment`, ECS service, or VM)—**not** Vercel serverless—for `boss.work()` handlers.
5. Define **retry / DLQ** policy and alerts (pair with `CRON_FAILURE_WEBHOOK_URL` patterns).

## Failure modes

- **No worker:** jobs pile up in Postgres until TTL; monitor queue depth.
- **Duplicate execution:** use idempotent handlers or dedupe keys when you implement real enqueue.
- **Vercel-only hosting:** keep using HTTP crons for short work; use a worker for anything > tens of seconds or needing retries.

## Runbook tone

On-call: if enqueue is enabled but worker is down, **scale worker to 1+** or **disable producers** (`JOB_QUEUE_ENABLED=false`) until backlog is drained—tune per your SRE playbook.
