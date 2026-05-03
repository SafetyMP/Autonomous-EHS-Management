import type { Db } from "@/server/db";
import { approvalRequest } from "@/server/db/schema";
import { insertSerialApprovalSteps } from "@/server/services/capaApprovalSteps";

/** Transaction surface used by Drizzle `.transaction(tx => ...)`. */
type DbTx = Pick<Db, "insert">;

/** Creates `approval_request` + serial SLA steps for a work permit awaiting authorization. */
export async function insertWorkPermitApprovalRequestTx(
  tx: DbTx,
  input: {
    organizationId: string;
    workPermitId: string;
    approverUserIds: string[];
    actorUserId: string;
    slaDaysPerStep?: number;
  },
): Promise<string> {
  const [req] = await tx
    .insert(approvalRequest)
    .values({
      organizationId: input.organizationId,
      entityType: "work_permit",
      entityId: input.workPermitId,
      status: "open",
      createdByUserId: input.actorUserId,
    })
    .returning();

  if (!req) {
    throw new Error("Failed to create approval request for work permit.");
  }

  await insertSerialApprovalSteps(tx, {
    organizationId: input.organizationId,
    requestId: req.id,
    approverUserIds: input.approverUserIds,
    actorUserId: input.actorUserId,
    slaDaysPerStep: input.slaDaysPerStep,
    auditAction: "approval.submit_work_permit",
    auditPayload: { workPermitId: input.workPermitId, approverUserIds: input.approverUserIds },
  });

  return req.id;
}
