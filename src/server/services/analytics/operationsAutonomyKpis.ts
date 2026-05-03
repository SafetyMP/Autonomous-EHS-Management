import { and, count, desc, eq, gte } from "drizzle-orm";
import { addDaysUtc, utcStartOfDay } from "@/lib/analytics/safetyDashboardKpis";
import type { Db } from "@/server/db";
import { cronJobRun, escalationEvent } from "@/server/db/schema";

export type ProgramAutomationKpis = {
  observationFollowUpEscalationsRecorded90d: number | null;
  approvalSlaEscalationsRecorded90d: number | null;
};

export type CronHealthKpis = {
  jobs: {
    jobKey: string;
    lastStartedAt: string;
    lastOk: boolean;
    lastDurationMs: number;
  }[];
};

/**
 * Deterministic “operations autonomy” slices: SLA escalation counts (audit log complements
 * `escalation_event`) and deployment cron recency (org admins only — not org-scoped data).
 */
export async function fetchProgramAutomationKpis(
  db: Db,
  args: {
    organizationId: string;
    canObservation: boolean;
    canSeeApprovalEscalations: boolean;
    todayStart?: Date;
  },
): Promise<ProgramAutomationKpis> {
  const todayStart = args.todayStart ?? utcStartOfDay(new Date());
  const since90 = addDaysUtc(todayStart, -90);
  const { organizationId } = args;

  const [obsEsc90Row, apprEsc90Row] = await Promise.all([
    args.canObservation
      ? db
          .select({ n: count() })
          .from(escalationEvent)
          .where(
            and(
              eq(escalationEvent.organizationId, organizationId),
              eq(escalationEvent.entityType, "safety_observation"),
              gte(escalationEvent.detectedAt, since90),
            ),
          )
      : Promise.resolve([{ n: 0 }]),
    args.canSeeApprovalEscalations
      ? db
          .select({ n: count() })
          .from(escalationEvent)
          .where(
            and(
              eq(escalationEvent.organizationId, organizationId),
              eq(escalationEvent.entityType, "approval_step"),
              gte(escalationEvent.detectedAt, since90),
            ),
          )
      : Promise.resolve([{ n: 0 }]),
  ]);

  return {
    observationFollowUpEscalationsRecorded90d: args.canObservation
      ? Number(obsEsc90Row[0]?.n ?? 0)
      : null,
    approvalSlaEscalationsRecorded90d: args.canSeeApprovalEscalations
      ? Number(apprEsc90Row[0]?.n ?? 0)
      : null,
  };
}

export async function fetchCronHealthForAdmin(db: Db): Promise<CronHealthKpis | null> {
  const runs = await db
    .select({
      jobKey: cronJobRun.jobKey,
      startedAt: cronJobRun.startedAt,
      ok: cronJobRun.ok,
      durationMs: cronJobRun.durationMs,
    })
    .from(cronJobRun)
    .orderBy(desc(cronJobRun.startedAt))
    .limit(400);

  const latestByKey = new Map<
    string,
    { jobKey: string; startedAt: Date; ok: boolean; durationMs: number }
  >();
  for (const r of runs) {
    if (!latestByKey.has(r.jobKey)) {
      latestByKey.set(r.jobKey, r);
    }
  }

  return {
    jobs: [...latestByKey.values()]
      .sort((a, b) => a.jobKey.localeCompare(b.jobKey))
      .map((r) => ({
        jobKey: r.jobKey,
        lastStartedAt: r.startedAt.toISOString(),
        lastOk: r.ok,
        lastDurationMs: r.durationMs,
      })),
  };
}
