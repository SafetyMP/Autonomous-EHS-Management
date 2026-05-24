/**
 * Typed job names for future pg-boss (or other) workers. Keep names stable once workers exist.
 */
import type { HrisMembershipSyncInput } from "@/lib/integration/inboundEnvelope";

export const JOB_NAMES = {
  /** Example: chunk data-retention or re-embed work off the HTTP cron path. */
  DATA_RETENTION_RUN_CHUNK: "dataRetention.runChunk",
  /** Replay a failed `integration_event` via pg-boss worker. */
  INTEGRATION_REPROCESS_FAILED: "integration.reprocessFailed",
  /** HRIS inbound webhook body processed off the serverless request path when pg-boss is enabled. */
  INTEGRATION_INBOUND_HRIS: "integration.inboundHris",
  /** Nightly roster drift reconciliation for PortCo HRIS exports. */
  INTEGRATION_RECONCILE_ROSTER: "integration.reconcileRoster",
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export type JobPayloadMap = {
  [JOB_NAMES.DATA_RETENTION_RUN_CHUNK]: {
    organizationId?: string;
    batchSize?: number;
  };
  [JOB_NAMES.INTEGRATION_REPROCESS_FAILED]: {
    organizationId: string;
    eventId: string;
    actorUserId: string;
  };
  [JOB_NAMES.INTEGRATION_INBOUND_HRIS]: {
    input: HrisMembershipSyncInput;
    idempotencyKey: string | null;
  };
  [JOB_NAMES.INTEGRATION_RECONCILE_ROSTER]: {
    organizationId: string;
  };
};

export type JobEnqueueOptions = {
  /** pg-boss deduplication key (e.g. org + connector idempotency). */
  singletonKey?: string;
};

export type JobQueue = {
  enqueue<N extends JobName>(
    name: N,
    payload: JobPayloadMap[N],
    options?: JobEnqueueOptions,
  ): Promise<void>;
};
