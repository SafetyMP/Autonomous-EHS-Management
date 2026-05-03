import type { Db } from "@/server/db";
import { approvalRequest } from "@/server/db/schema";
import { insertSerialApprovalSteps } from "@/server/services/capaApprovalSteps";

/** Transaction surface used by Drizzle `.transaction(tx => ...)`. */
type DbTx = Pick<Db, "insert">;

/** Creates `approval_request` + serial SLA steps for regulatory permit activation. */
export async function insertEnvironmentalRegulatoryPermitApprovalRequestTx(
  tx: DbTx,
  input: {
    organizationId: string;
    environmentalRegulatoryPermitId: string;
    approverUserIds: string[];
    actorUserId: string;
    slaDaysPerStep?: number;
  },
): Promise<string> {
  const [req] = await tx
    .insert(approvalRequest)
    .values({
      organizationId: input.organizationId,
      entityType: "environmental_regulatory_permit",
      entityId: input.environmentalRegulatoryPermitId,
      status: "open",
      createdByUserId: input.actorUserId,
    })
    .returning();

  if (!req) {
    throw new Error("Failed to create approval request for environmental regulatory permit.");
  }

  await insertSerialApprovalSteps(tx, {
    organizationId: input.organizationId,
    requestId: req.id,
    approverUserIds: input.approverUserIds,
    actorUserId: input.actorUserId,
    slaDaysPerStep: input.slaDaysPerStep,
    auditAction: "approval.submit_environmental_regulatory_permit",
    auditPayload: {
      environmentalRegulatoryPermitId: input.environmentalRegulatoryPermitId,
      approverUserIds: input.approverUserIds,
    },
  });

  return req.id;
}
