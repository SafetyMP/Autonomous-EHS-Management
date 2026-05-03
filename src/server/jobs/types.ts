/**
 * Typed job names for future pg-boss (or other) workers. Keep names stable once workers exist.
 */
export const JOB_NAMES = {
  /** Example: chunk data-retention or re-embed work off the HTTP cron path. */
  DATA_RETENTION_RUN_CHUNK: "dataRetention.runChunk",
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export type JobPayloadMap = {
  [JOB_NAMES.DATA_RETENTION_RUN_CHUNK]: {
    organizationId?: string;
    batchSize?: number;
  };
};

export type JobQueue = {
  enqueue<N extends JobName>(name: N, payload: JobPayloadMap[N]): Promise<void>;
};
