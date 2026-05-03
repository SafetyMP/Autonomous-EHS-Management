import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { notifyCronFailure } from "@/server/cron/notifyOnFailure";
import { tryRecordCronJobRun } from "@/server/cron/recordCronRun";
import { runDataRetentionCron } from "@/server/services/dataRetention";

/**
 * Vercel Cron: set `CRON_SECRET` and send `Authorization: Bearer <secret>`.
 * Anonymizes incidents past `retain_until` (unless `legal_hold`). Also processes **program** records when `retain_until` is set:
 * safety observations (`safety_observation_program` policies), work permits (`work_permit_program`), environmental regulatory permits (`environmental_regulatory_permit_program`), and risk assessments (`risk_assessment_program`).
 * Hard-deletes only when org has matching `data_retention_policy` with `action = delete` for each record class.
 */
export async function GET(request: Request) {
  const secret = env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const route = "GET /api/cron/data-retention";
  const startedAt = new Date();
  try {
    const result = await runDataRetentionCron(db);
    const finishedAt = new Date();
    await tryRecordCronJobRun(db, {
      jobKey: "data-retention",
      startedAt,
      finishedAt,
      ok: true,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    });
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (e) {
    const finishedAt = new Date();
    await tryRecordCronJobRun(db, {
      jobKey: "data-retention",
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
