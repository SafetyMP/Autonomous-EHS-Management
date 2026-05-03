import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import {
  approvalRequest,
  approvalStep,
  escalationEvent,
} from "@/server/db/schema";

/** Row just inserted for `escalation_event` when an approval step SLA is overdue (for operational webhooks). */
export type NewApprovalStepEscalation = {
  escalationEventId: string;
  organizationId: string;
  approvalStepId: string;
  approvalRequestId: string;
  requestEntityType: string;
  requestEntityId: string;
  stepOrder: number;
  message: string | null;
};

/** Inserts one `escalation_event` per overdue pending approval step (deduped by step id). */
export async function recordOverdueApprovalEscalations(
  db: Db,
  now: Date = new Date(),
): Promise<{ inserted: number; newlyCreated: NewApprovalStepEscalation[] }> {
  const openReqs = await db
    .select()
    .from(approvalRequest)
    .where(eq(approvalRequest.status, "open"));

  let inserted = 0;
  const newlyCreated: NewApprovalStepEscalation[] = [];

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

    const msg = `Approval step ${pendingDue.stepOrder} overdue (${req.entityType} ${req.entityId}).`;
    const [created] = await db
      .insert(escalationEvent)
      .values({
        organizationId: req.organizationId,
        entityType: "approval_step",
        entityId: pendingDue.id,
        message: msg,
        notifiedUserIds: [],
      })
      .returning({ id: escalationEvent.id });

    if (created) {
      inserted += 1;
      newlyCreated.push({
        escalationEventId: created.id,
        organizationId: req.organizationId,
        approvalStepId: pendingDue.id,
        approvalRequestId: req.id,
        requestEntityType: req.entityType,
        requestEntityId: req.entityId,
        stepOrder: pendingDue.stepOrder,
        message: msg,
      });
    }
  }

  return { inserted, newlyCreated };
}
