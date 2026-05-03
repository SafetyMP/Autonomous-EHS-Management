import type { InferSelectModel } from "drizzle-orm";

import type { workPermit } from "@/server/db/schema";

type PermitRow = Pick<InferSelectModel<typeof workPermit>, "status">;

export type WorkPermitStatus = PermitRow["status"];

/**
 * Allowed user-driven status moves. Activating (`pending_approval` → `active`) and rejecting
 * are handled only via approval resolution in the approval router, not arbitrary updates.
 */
export function allowedWorkPermitTransition(row: PermitRow | null | undefined, to: WorkPermitStatus): boolean {
  if (!row) return false;
  const from = row.status;
  if (from === to) return true;

  if (from === "draft") {
    return to === "pending_approval" || to === "cancelled";
  }
  if (from === "pending_approval") {
    return to === "cancelled";
  }
  if (from === "active") {
    return to === "completed" || to === "cancelled" || to === "expired";
  }
  return false;
}
