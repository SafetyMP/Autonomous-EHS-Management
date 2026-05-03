import type { Db } from "@/server/db";
import { approvalStep } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { buildApprovalStepDueDates } from "@/server/services/approvalDueDates";

type Tx = Pick<Db, "insert">;

export async function insertCapaApprovalSteps(
  tx: Tx,
  input: {
    organizationId: string;
    requestId: string;
    correctiveActionId: string;
    approverUserIds: string[];
    actorUserId: string;
    slaDaysPerStep?: number;
  },
): Promise<void> {
  const sla = input.slaDaysPerStep ?? 7;
  const base = new Date();
  const dueDates = buildApprovalStepDueDates(base, input.approverUserIds.length, sla);

  for (let i = 0; i < input.approverUserIds.length; i++) {
    await tx.insert(approvalStep).values({
      requestId: input.requestId,
      stepOrder: i,
      approverUserId: input.approverUserIds[i]!,
      status: "pending",
      dueAt: dueDates[i]!,
    });
  }

  await writeAuditLog(tx, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "approval.submit_capa",
    entityType: "approval_request",
    entityId: input.requestId,
    payload: {
      correctiveActionId: input.correctiveActionId,
      approverUserIds: input.approverUserIds,
      slaDaysPerStep: sla,
    },
  });
}
