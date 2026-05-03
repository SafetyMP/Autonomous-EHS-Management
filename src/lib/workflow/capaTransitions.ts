import { correctiveActionStatusEnum } from "@/server/db/schema";

type CapaStatus = (typeof correctiveActionStatusEnum.enumValues)[number];

const transitions: Record<CapaStatus, CapaStatus[]> = {
  pending_approval: ["planned"],
  planned: ["in_progress"],
  in_progress: ["completed"],
  completed: ["verified"],
  verified: [],
};

export function allowedCapaTransition(from: CapaStatus, to: CapaStatus): boolean {
  return (transitions[from] ?? []).includes(to);
}
