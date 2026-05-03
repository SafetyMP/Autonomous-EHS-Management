import { NextResponse } from "next/server";
import { db } from "@/server/db";
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

  const result = await runDataRetentionCron(db);
  return NextResponse.json({
    ok: true,
    ...result,
  });
}
