import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { readValidatedEnv } from "@/server/read-env";
import { notifyCronFailure } from "@/server/cron/notifyOnFailure";
import { tryRecordCronJobRun } from "@/server/cron/recordCronRun";
import { integrationRosterSnapshot } from "@/server/db/schema";
import { env } from "@/lib/env";
import { getJobQueue } from "@/server/jobs/queue";
import { JOB_NAMES } from "@/server/jobs/types";
import { reconcileRosterForOrg } from "@/server/services/rosterReconciliation";

/**
 * Vercel Cron: nightly roster drift reconcile for orgs with at least one snapshot.
 * Configure `CRON_SECRET` and Authorization: Bearer <secret>.
 * When `PG_BOSS_ENABLED=true`, enqueues `integration.reconcileRoster` per org; otherwise runs inline.
 */
export async function GET(request: Request) {
  const validatedEnv = readValidatedEnv();
  const secret = validatedEnv.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const route = "GET /api/cron/integration-roster-reconcile";
  const startedAt = new Date();
  try {
    const orgRows = await db
      .selectDistinct({ organizationId: integrationRosterSnapshot.organizationId })
      .from(integrationRosterSnapshot);

    let queued = 0;
    let reconciled = 0;
    let totalDrift = 0;

    for (const { organizationId } of orgRows) {
      if (env.PG_BOSS_ENABLED === "true") {
        await getJobQueue().enqueue(JOB_NAMES.INTEGRATION_RECONCILE_ROSTER, {
          organizationId,
        });
        queued += 1;
      } else {
        const result = await reconcileRosterForOrg(db, organizationId);
        reconciled += 1;
        totalDrift += result.driftCount;
      }
    }

    const finishedAt = new Date();
    await tryRecordCronJobRun(db, {
      jobKey: "integration-roster-reconcile",
      startedAt,
      finishedAt,
      ok: true,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    });

    return NextResponse.json({
      ok: true,
      orgCount: orgRows.length,
      queued,
      reconciled,
      totalDrift,
    });
  } catch (e) {
    const finishedAt = new Date();
    await tryRecordCronJobRun(db, {
      jobKey: "integration-roster-reconcile",
      startedAt,
      finishedAt,
      ok: false,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    await notifyCronFailure(route, e);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
