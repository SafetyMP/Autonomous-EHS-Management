import { allowedCapaTransition } from "@/lib/workflow/capaTransitions";
import { allowedIncidentTransition } from "@/lib/workflow/incidentTransitions";
import { allowedInspectionTransition } from "@/lib/workflow/inspectionTransitions";
import { allowedWorkPermitTransition } from "@/lib/workflow/permitTransitions";
import {
  correctiveActionStatusEnum,
  incidentStatusEnum,
  inspectionStatusEnum,
  workPermitStatusEnum,
} from "@/server/db/schema";

function transitionEdges(
  statuses: readonly string[],
  allowed: (from: string, to: string) => boolean,
): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  for (const from of statuses) {
    for (const to of statuses) {
      if (from !== to && allowed(from, to)) {
        out.push({ from, to });
      }
    }
  }
  return out;
}

export type EncodedWorkflowCatalog = {
  version: 1;
  generatedAt: string;
  entities: {
    entity: string;
    label: string;
    notes?: string;
    transitions: { from: string; to: string }[];
  }[];
};

/** Read-only snapshot of user-driven status transitions encoded in application logic (not DB-configurable). */
export function buildEncodedWorkflowCatalog(): EncodedWorkflowCatalog {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    entities: [
      {
        entity: "incident",
        label: "Incident",
        notes:
          "Org admins (`org:admin`) may reopen a closed incident to investigating with `reopenJustification` (audit-logged); that edge is not a generic transition.",
        transitions: transitionEdges(incidentStatusEnum.enumValues, (from, to) =>
          allowedIncidentTransition(
            from as (typeof incidentStatusEnum.enumValues)[number],
            to as (typeof incidentStatusEnum.enumValues)[number],
          ),
        ),
      },
      {
        entity: "inspection",
        label: "Inspection",
        transitions: transitionEdges(inspectionStatusEnum.enumValues, (from, to) =>
          allowedInspectionTransition(
            from as (typeof inspectionStatusEnum.enumValues)[number],
            to as (typeof inspectionStatusEnum.enumValues)[number],
          ),
        ),
      },
      {
        entity: "corrective_action",
        label: "CAPA / corrective action",
        transitions: transitionEdges(correctiveActionStatusEnum.enumValues, (from, to) =>
          allowedCapaTransition(
            from as (typeof correctiveActionStatusEnum.enumValues)[number],
            to as (typeof correctiveActionStatusEnum.enumValues)[number],
          ),
        ),
      },
      {
        entity: "work_permit",
        label: "Work permit",
        notes:
          "Moves from pending_approval to active (or rejected) are resolved through the approval workflow, not arbitrary status updates.",
        transitions: transitionEdges(workPermitStatusEnum.enumValues, (from, to) =>
          allowedWorkPermitTransition(
            { status: from as (typeof workPermitStatusEnum.enumValues)[number] },
            to as (typeof workPermitStatusEnum.enumValues)[number],
          ),
        ),
      },
    ],
  };
}
