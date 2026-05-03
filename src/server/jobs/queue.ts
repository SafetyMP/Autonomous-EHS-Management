import { env } from "@/lib/env";
import { logInfo } from "@/lib/logger";
import type { JobName, JobPayloadMap, JobQueue } from "./types";

class NoopJobQueue implements JobQueue {
  async enqueue<N extends JobName>(_name: N, _payload: JobPayloadMap[N]): Promise<void> {
    void _name;
    void _payload;
  }
}

class LoggingDevJobQueue implements JobQueue {
  async enqueue<N extends JobName>(name: N, payload: JobPayloadMap[N]): Promise<void> {
    logInfo("job.enqueue.dev_noop", { name, payload });
  }
}

let singleton: JobQueue | null = null;

/** Returns a process-wide job queue. Without `JOB_QUEUE_ENABLED=true`, operations are no-ops (or dev logs). */
export function getJobQueue(): JobQueue {
  if (singleton) {
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

/**
 * Register handlers for a future pg-boss worker process.
 * No-op until `pg-boss` is added and a worker entrypoint calls this.
 */
export function registerStubJobHandlers(_queue: JobQueue): void {
  void _queue;
  /* Step 2 (see docs/JOB_QUEUE.md): wire boss.work(JOB_NAMES.DATA_RETENTION_RUN_CHUNK, handler) */
}
