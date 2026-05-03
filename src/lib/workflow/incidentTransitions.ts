import { incidentStatusEnum } from "@/server/db/schema";

type IncidentStatus = (typeof incidentStatusEnum.enumValues)[number];

const transitions: Record<IncidentStatus, IncidentStatus[]> = {
  open: ["investigating"],
  investigating: ["closed"],
  closed: [],
};

/** Org admin override: reopen a closed incident for further investigation (audit-logged). */
export function allowedIncidentAdminReopen(from: IncidentStatus, to: IncidentStatus): boolean {
  return from === "closed" && to === "investigating";
}

export function allowedIncidentTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return (transitions[from] ?? []).includes(to);
}
