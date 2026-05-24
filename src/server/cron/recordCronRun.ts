import type { Db } from "@/server/db";
import { cronJobRun } from "@/server/db/schema";
import { logWarn } from "@/lib/logger";

export const CRON_JOB_KEYS = ["reminders", "data-retention", "integration-roster-reconcile"] as const;
export type CronJobKey = (typeof CRON_JOB_KEYS)[number];

/** Max length for persisted `cron_job_run.error_message` (operational metrics only). */
const CRON_ERROR_MESSAGE_MAX_LENGTH = 512;

/** Collapses whitespace and caps length before persisting to reduce accidental leakage in Postgres. */
export function normalizeCronJobErrorMessage(message: string | null | undefined): string | null {
  if (message === undefined || message === null) return null;
  const collapsed = message.trim().replace(/\s+/g, " ");
  if (collapsed.length <= CRON_ERROR_MESSAGE_MAX_LENGTH) {
    return collapsed.length > 0 ? collapsed : null;
  }
  return collapsed.slice(0, CRON_ERROR_MESSAGE_MAX_LENGTH);
}

export async function tryRecordCronJobRun(
  db: Db,
  input: {
    jobKey: CronJobKey;
    startedAt: Date;
    finishedAt: Date;
    ok: boolean;
    durationMs: number;
    errorMessage?: string | null;
  },
): Promise<void> {
  try {
    await db.insert(cronJobRun).values({
      jobKey: input.jobKey,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      ok: input.ok,
      durationMs: input.durationMs,
      errorMessage: normalizeCronJobErrorMessage(input.errorMessage),
    });
  } catch (e) {
    logWarn("cron.metrics.run_persist_failed", {
      jobKey: input.jobKey,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
