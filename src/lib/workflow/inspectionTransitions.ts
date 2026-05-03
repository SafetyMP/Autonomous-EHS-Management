import { inspectionStatusEnum } from "@/server/db/schema";

type InspectionStatus = (typeof inspectionStatusEnum.enumValues)[number];

const transitions: Record<InspectionStatus, InspectionStatus[]> = {
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function allowedInspectionTransition(
  from: InspectionStatus,
  to: InspectionStatus,
): boolean {
  return (transitions[from] ?? []).includes(to);
}
