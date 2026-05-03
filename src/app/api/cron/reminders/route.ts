import { NextResponse } from "next/server";
import { and, isNotNull, lte } from "drizzle-orm";
import { db } from "@/server/db";
import { complianceObligation } from "@/server/db/schema";

/**
 * Vercel Cron: configure `CRON_SECRET` and Authorization: Bearer <secret>.
 * Schedules obligations with next_review_due within the next 7 days (summary only).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const due = await db
    .select({ id: complianceObligation.id, organizationId: complianceObligation.organizationId })
    .from(complianceObligation)
    .where(
      and(
        lte(complianceObligation.nextReviewDue, horizon),
        isNotNull(complianceObligation.nextReviewDue),
      ),
    )
    .limit(500);

  return NextResponse.json({
    ok: true,
    checkedAt: now.toISOString(),
    obligationsDueOrSoon: due.length,
  });
}
