import { incidentStatusEnum } from "@/server/db/schema";

type IncidentStatus = (typeof incidentStatusEnum.enumValues)[number];

const transitions: Record<IncidentStatus, IncidentStatus[]> = {
  open: ["investigating"],
  investigating: ["closed"],
  closed: [],
};

export function allowedIncidentTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return (transitions[from] ?? []).includes(to);
}
