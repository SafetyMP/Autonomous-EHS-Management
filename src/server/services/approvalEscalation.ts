import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import {
  approvalRequest,
  approvalStep,
  escalationEvent,
} from "@/server/db/schema";

/** Inserts one `escalation_event` per overdue pending approval step (deduped by step id). */
export async function recordOverdueApprovalEscalations(
  db: Db,
  now: Date = new Date(),
): Promise<{ inserted: number }> {
  const openReqs = await db
    .select()
    .from(approvalRequest)
    .where(eq(approvalRequest.status, "open"));

  let inserted = 0;

  for (const req of openReqs) {
    const steps = await db
      .select()
      .from(approvalStep)
      .where(eq(approvalStep.requestId, req.id))
      .orderBy(asc(approvalStep.stepOrder));

    const pendingDue = steps.find(
      (s) => s.status === "pending" && s.dueAt != null && s.dueAt < now,
    );
    if (!pendingDue) continue;

    const [existing] = await db
      .select({ id: escalationEvent.id })
      .from(escalationEvent)
      .where(
        and(
          eq(escalationEvent.organizationId, req.organizationId),
          eq(escalationEvent.entityType, "approval_step"),
          eq(escalationEvent.entityId, pendingDue.id),
        ),
      )
      .limit(1);

    if (existing) continue;

    await db.insert(escalationEvent).values({
      organizationId: req.organizationId,
      entityType: "approval_step",
      entityId: pendingDue.id,
      message: `Approval step ${pendingDue.stepOrder} overdue (${req.entityType} ${req.entityId}).`,
      notifiedUserIds: [],
    });
    inserted += 1;
  }

  return { inserted };
}
