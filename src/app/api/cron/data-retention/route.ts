import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { notifyCronFailure } from "@/server/cron/notifyOnFailure";
import { runDataRetentionCron } from "@/server/services/dataRetention";

/**
 * Vercel Cron: set `CRON_SECRET` and send `Authorization: Bearer <secret>`.
 * Anonymizes incidents past `retain_until` (unless `legal_hold`).
 * Hard-deletes only when org has `data_retention_policy` with `record_class = incident_general` and `action = delete`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const route = "GET /api/cron/data-retention";
  try {
    const result = await runDataRetentionCron(db);
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (e) {
    await notifyCronFailure(route, e);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
