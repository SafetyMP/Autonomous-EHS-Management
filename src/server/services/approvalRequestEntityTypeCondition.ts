import { eq, or, type SQL } from "drizzle-orm";
import { approvalRequest } from "@/server/db/schema";

/**
 * SQL fragment for `approval_request.entity_type` when filtering mixed approval inboxes.
 * Callers must ensure at least one flag is true.
 */
export function approvalRequestEntityTypeCondition(opts: {
  capaApprove: boolean;
  permitApprove: boolean;
  environmentalPermitApprove: boolean;
}): SQL {
  const { capaApprove, permitApprove, environmentalPermitApprove } = opts;
  const parts: SQL[] = [];
  if (capaApprove) parts.push(eq(approvalRequest.entityType, "capa"));
  if (permitApprove) parts.push(eq(approvalRequest.entityType, "work_permit"));
  if (environmentalPermitApprove) {
    parts.push(eq(approvalRequest.entityType, "environmental_regulatory_permit"));
  }
  if (parts.length === 0) {
    return eq(approvalRequest.entityType, "capa");
  }
  if (parts.length === 1) {
    return parts[0]!;
  }
  return or(...parts)!;
}
