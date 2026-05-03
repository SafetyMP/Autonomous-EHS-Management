import { env } from "@/lib/env";
import { logInfo } from "@/lib/logger";
import { PgBossJobQueue } from "./pgbossQueue";
import type { JobEnqueueOptions, JobName, JobPayloadMap, JobQueue } from "./types";

class NoopJobQueue implements JobQueue {
  async enqueue<N extends JobName>(
    _name: N,
    _payload: JobPayloadMap[N],
    _options?: JobEnqueueOptions,
  ): Promise<void> {
    void _name;
    void _payload;
    void _options;
  }
}

class LoggingDevJobQueue implements JobQueue {
  async enqueue<N extends JobName>(
    name: N,
    payload: JobPayloadMap[N],
    options?: JobEnqueueOptions,
  ): Promise<void> {
    logInfo("job.enqueue.dev_noop", { name, payload, options });
  }
}

let singleton: JobQueue | null = null;

/**
 * Returns a process-wide job queue.
 * - `PG_BOSS_ENABLED=true`: durable pg-boss send (requires `npm run job:worker` elsewhere).
 * - `JOB_QUEUE_ENABLED=true` without pg-boss: dev logging only.
 * - Otherwise: no-op.
 */
export function getJobQueue(): JobQueue {
  if (singleton) {
    return singleton;
  }
  if (env.PG_BOSS_ENABLED === "true") {
    singleton = new PgBossJobQueue();
    return singleton;
  }
  if (env.JOB_QUEUE_ENABLED === "true") {
    singleton =
      process.env.NODE_ENV === "production"
        ? new NoopJobQueue()
        : new LoggingDevJobQueue();
    return singleton;
  }
  singleton = new NoopJobQueue();
  return singleton;
}

/** Register handlers from a worker entrypoint. See `scripts/job-worker.ts`. */
export function registerStubJobHandlers(_queue: JobQueue): void {
  void _queue;
}
