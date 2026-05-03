import { NextResponse } from "next/server";
import { and, isNotNull, lte } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { complianceObligation } from "@/server/db/schema";
import { notifyCronFailure } from "@/server/cron/notifyOnFailure";
import { tryRecordCronJobRun } from "@/server/cron/recordCronRun";
import { recordOverdueApprovalEscalations } from "@/server/services/approvalEscalation";
import { markExpiredCredentials } from "@/server/services/credentialExpiry";
import { recordOverdueObservationFollowUpEscalations } from "@/server/services/observationFollowUpEscalation";
import { dispatchOperationalWebhooks } from "@/server/services/operationalWebhookDispatch";

/**
 * Vercel Cron: configure `CRON_SECRET` and Authorization: Bearer <secret>.
 * Schedules obligations with next_review_due within the next 7 days (summary only).
 * Also runs contractor credential expiry, overdue approval escalation recording, and **observation follow-up SLA** escalations.
 */
export async function GET(request: Request) {
  const secret = env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const route = "GET /api/cron/reminders";
  const startedAt = new Date();
  try {
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

    const { updated: credentialsMarkedExpired, affectedByOrg: credentialExpiryBatches } =
      await markExpiredCredentials(db);
    const { inserted: approvalEscalationsRecorded, newlyCreated: approvalEscalationRows } =
      await recordOverdueApprovalEscalations(db, now);
    const escalationOut = await recordOverdueObservationFollowUpEscalations(db, now);
    const observationFollowUpEscalationsRecorded = escalationOut.inserted;
    await Promise.all(
      approvalEscalationRows.map((row) =>
        dispatchOperationalWebhooks({
          db,
          organizationId: row.organizationId,
          eventType: "approval.step_escalated",
          data: {
            escalationEventId: row.escalationEventId,
            approvalStepId: row.approvalStepId,
            approvalRequestId: row.approvalRequestId,
            requestEntityType: row.requestEntityType,
            requestEntityId: row.requestEntityId,
            stepOrder: row.stepOrder,
            message: row.message,
          },
        }),
      ),
    );
    await Promise.all(
      escalationOut.newlyCreated.map((ev) =>
        dispatchOperationalWebhooks({
          db,
          organizationId: ev.organizationId,
          eventType: "observation.follow_up_escalated",
          data: {
            escalationEventId: ev.id,
            observationId: ev.entityId,
            message: ev.message,
          },
        }),
      ),
    );

    await Promise.all(
      credentialExpiryBatches.map((batch) =>
        dispatchOperationalWebhooks({
          db,
          organizationId: batch.organizationId,
          eventType: "program.credential_batch_expired",
          data: {
            expiredCount: batch.count,
            credentialIdsSample: batch.credentialIdsSample,
          },
        }),
      ),
    );

    const finishedAt = new Date();
    await tryRecordCronJobRun(db, {
      jobKey: "reminders",
      startedAt,
      finishedAt,
      ok: true,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    });
    return NextResponse.json({
      ok: true,
      checkedAt: now.toISOString(),
      obligationsDueOrSoon: due.length,
      credentialsMarkedExpired,
      approvalEscalationsRecorded,
      observationFollowUpEscalationsRecorded,
    });
  } catch (e) {
    const finishedAt = new Date();
    await tryRecordCronJobRun(db, {
      jobKey: "reminders",
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
