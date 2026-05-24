import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  approvalRequest,
  auditFinding,
  complianceObligation,
  correctiveAction,
  correctiveActionStatusEnum,
  environmentalAspect,
  environmentalRegulatoryPermit,
  incident,
  internalAudit,
  managementReview,
  safetyObservation,
  workflowTransition,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { insertCapaApprovalSteps } from "@/server/services/capaApprovalSteps";
import { allowedCapaTransition } from "@/lib/workflow/capaTransitions";
import { assertOrgMemberUserId } from "../assertOrgScoped";
import { protectedMutation, protectedProcedure, router } from "../init";
import { orgScope } from "../schemas/orgScope";

const capaStatuses = correctiveActionStatusEnum.enumValues as [
  string,
  ...string[],
];

function countCapaSources(input: {
  incidentId?: string | undefined;
  auditFindingId?: string | undefined;
  environmentalAspectId?: string | undefined;
  complianceObligationId?: string | undefined;
  managementReviewId?: string | undefined;
  environmentalRegulatoryPermitId?: string | undefined;
}): number {
  let n = 0;
  if (input.incidentId) n++;
  if (input.auditFindingId) n++;
  if (input.environmentalAspectId) n++;
  if (input.complianceObligationId) n++;
  if (input.managementReviewId) n++;
  if (input.environmentalRegulatoryPermitId) n++;
  return n;
}

export const capaRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.CAPA_READ,
    );

    return ctx.db
      .select()
      .from(correctiveAction)
      .where(eq(correctiveAction.organizationId, input.organizationId))
      .orderBy(desc(correctiveAction.createdAt));
  }),

  get: protectedProcedure
    .input(orgScope.extend({ correctiveActionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CAPA_READ,
      );

      const [row] = await ctx.db
        .select()
        .from(correctiveAction)
        .where(
          and(
            eq(correctiveAction.id, input.correctiveActionId),
            eq(correctiveAction.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Corrective action not found." });
      }

      type SourceLink = { kind: string; id: string; label: string; href: string };

      const sources: SourceLink[] = [];

      if (row.incidentId) {
        const [inc] = await ctx.db
          .select({ id: incident.id, title: incident.title })
          .from(incident)
          .where(
            and(
              eq(incident.id, row.incidentId),
              eq(incident.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (inc) {
          sources.push({
            kind: "incident",
            id: inc.id,
            label: inc.title,
            href: `/dashboard/incidents/${inc.id}`,
          });
        }
      }

      const [finding] = await ctx.db
        .select({
          id: auditFinding.id,
          title: auditFinding.title,
          internalAuditId: auditFinding.internalAuditId,
        })
        .from(auditFinding)
        .where(
          and(
            eq(auditFinding.correctiveActionId, row.id),
            eq(auditFinding.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (finding) {
        const [audit] = await ctx.db
          .select({ title: internalAudit.title })
          .from(internalAudit)
          .where(eq(internalAudit.id, finding.internalAuditId))
          .limit(1);
        sources.push({
          kind: "audit_finding",
          id: finding.id,
          label: `${finding.title}${audit ? ` (${audit.title})` : ""}`,
          href: `/dashboard/audits?finding=${finding.id}`,
        });
      }

      const [obs] = await ctx.db
        .select({ id: safetyObservation.id, summary: safetyObservation.summary })
        .from(safetyObservation)
        .where(
          and(
            eq(safetyObservation.linkedCorrectiveActionId, row.id),
            eq(safetyObservation.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (obs) {
        sources.push({
          kind: "observation",
          id: obs.id,
          label: obs.summary,
          href: `/dashboard/observations/${obs.id}`,
        });
      }

      if (row.environmentalAspectId) {
        const [asp] = await ctx.db
          .select({ id: environmentalAspect.id, name: environmentalAspect.name })
          .from(environmentalAspect)
          .where(
            and(
              eq(environmentalAspect.id, row.environmentalAspectId),
              eq(environmentalAspect.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (asp) {
          sources.push({
            kind: "environmental_aspect",
            id: asp.id,
            label: asp.name,
            href: `/dashboard/environment?aspect=${asp.id}`,
          });
        }
      }

      if (row.complianceObligationId) {
        const [obl] = await ctx.db
          .select({ id: complianceObligation.id, title: complianceObligation.title })
          .from(complianceObligation)
          .where(
            and(
              eq(complianceObligation.id, row.complianceObligationId),
              eq(complianceObligation.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (obl) {
          sources.push({
            kind: "compliance_obligation",
            id: obl.id,
            label: obl.title,
            href: `/dashboard/environment?obligation=${obl.id}`,
          });
        }
      }

      if (row.environmentalRegulatoryPermitId) {
        const [perm] = await ctx.db
          .select({
            id: environmentalRegulatoryPermit.id,
            title: environmentalRegulatoryPermit.title,
          })
          .from(environmentalRegulatoryPermit)
          .where(
            and(
              eq(environmentalRegulatoryPermit.id, row.environmentalRegulatoryPermitId),
              eq(environmentalRegulatoryPermit.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (perm) {
          sources.push({
            kind: "environmental_regulatory_permit",
            id: perm.id,
            label: perm.title,
            href: `/dashboard/environmental-permits/${perm.id}`,
          });
        }
      }

      if (row.managementReviewId) {
        const [mr] = await ctx.db
          .select({ id: managementReview.id, summary: managementReview.summary })
          .from(managementReview)
          .where(
            and(
              eq(managementReview.id, row.managementReviewId),
              eq(managementReview.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (mr) {
          const line = mr.summary.trim().split(/\n/)[0] ?? "Management review";
          sources.push({
            kind: "management_review",
            id: mr.id,
            label: line.length > 80 ? `${line.slice(0, 79)}…` : line,
            href: `/dashboard/management-review?review=${mr.id}`,
          });
        }
      }

      const [openApproval] = await ctx.db
        .select({ id: approvalRequest.id })
        .from(approvalRequest)
        .where(
          and(
            eq(approvalRequest.organizationId, input.organizationId),
            eq(approvalRequest.entityType, "capa"),
            eq(approvalRequest.entityId, row.id),
            eq(approvalRequest.status, "open"),
          ),
        )
        .limit(1);

      return { capa: row, sources, hasOpenApproval: !!openApproval };
    }),

  create: protectedMutation
    .input(
      orgScope.extend({
        incidentId: z.string().uuid().optional(),
        auditFindingId: z.string().uuid().optional(),
        environmentalAspectId: z.string().uuid().optional(),
        complianceObligationId: z.string().uuid().optional(),
        managementReviewId: z.string().uuid().optional(),
        environmentalRegulatoryPermitId: z.string().uuid().optional(),
        title: z.string().min(3).max(512),
        details: z.string().max(50_000).optional(),
        dueDate: z.coerce.date().optional(),
        ownerUserId: z.string().optional(),
        initialStatus: z.enum(["planned", "pending_approval"]).optional().default("planned"),
        approverUserIdForPlan: z.string().optional(),
        approverUserIdsForPlan: z.array(z.string().min(1)).min(1).max(5).optional(),
        slaDaysPerPlanApproval: z.number().int().min(1).max(90).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CAPA_CREATE,
      );

      const sourceCount = countCapaSources(input);
      if (sourceCount > 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Link at most one source: incident, audit finding, environmental aspect, compliance obligation, environmental regulatory permit, or management review (or none for standalone CAPA).",
        });
      }

      if (sourceCount === 0) {
        const d = (input.details ?? "").trim();
        if (d.length < 20) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Standalone corrective actions require details (at least 20 characters) explaining the driver for the action.",
          });
        }
      }

      if (input.incidentId) {
        const [i] = await ctx.db
          .select()
          .from(incident)
          .where(
            and(
              eq(incident.id, input.incidentId),
              eq(incident.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!i) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Incident not found in this organization.",
          });
        }
      }

      if (input.auditFindingId) {
        const [f] = await ctx.db
          .select()
          .from(auditFinding)
          .where(
            and(
              eq(auditFinding.id, input.auditFindingId),
              eq(auditFinding.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!f) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Audit finding not found in this organization.",
          });
        }
        if (f.correctiveActionId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This finding already has a corrective action.",
          });
        }
      }

      if (input.environmentalAspectId) {
        const [a] = await ctx.db
          .select()
          .from(environmentalAspect)
          .where(
            and(
              eq(environmentalAspect.id, input.environmentalAspectId),
              eq(environmentalAspect.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!a) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Environmental aspect not found in this organization.",
          });
        }
      }

      if (input.complianceObligationId) {
        const [o] = await ctx.db
          .select()
          .from(complianceObligation)
          .where(
            and(
              eq(complianceObligation.id, input.complianceObligationId),
              eq(complianceObligation.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!o) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Compliance obligation not found in this organization.",
          });
        }
      }

      if (input.managementReviewId) {
        const [mr] = await ctx.db
          .select()
          .from(managementReview)
          .where(
            and(
              eq(managementReview.id, input.managementReviewId),
              eq(managementReview.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!mr) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Management review not found in this organization.",
          });
        }
      }

      if (input.environmentalRegulatoryPermitId) {
        const [p] = await ctx.db
          .select()
          .from(environmentalRegulatoryPermit)
          .where(
            and(
              eq(environmentalRegulatoryPermit.id, input.environmentalRegulatoryPermitId),
              eq(environmentalRegulatoryPermit.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!p) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Environmental regulatory permit not found in this organization.",
          });
        }
      }

      if (input.initialStatus === "pending_approval") {
        const approvers = input.approverUserIdsForPlan?.length
          ? [...new Set(input.approverUserIdsForPlan)]
          : input.approverUserIdForPlan
            ? [input.approverUserIdForPlan]
            : [];
        if (approvers.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "When starting pending approval, set plan approver(s) via approverUserIdForPlan or approverUserIdsForPlan.",
          });
        }
        for (const uid of approvers) {
          await assertOrgMemberUserId(ctx.db, input.organizationId, uid);
        }
      }

      let ownerId = ctx.user.id;
      if (input.ownerUserId && input.ownerUserId !== ctx.user.id) {
        await assertOrgMemberUserId(ctx.db, input.organizationId, input.ownerUserId);
        ownerId = input.ownerUserId;
      }

      return ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(correctiveAction)
          .values({
            organizationId: input.organizationId,
            incidentId: input.incidentId ?? null,
            environmentalAspectId: input.environmentalAspectId ?? null,
            complianceObligationId: input.complianceObligationId ?? null,
            environmentalRegulatoryPermitId: input.environmentalRegulatoryPermitId ?? null,
            managementReviewId: input.managementReviewId ?? null,
            title: input.title,
            details: input.details ?? null,
            dueDate: input.dueDate ?? null,
            ownerUserId: ownerId,
            status: input.initialStatus as (typeof correctiveActionStatusEnum.enumValues)[number],
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create corrective action.",
          });
        }

        if (input.auditFindingId) {
          await tx
            .update(auditFinding)
            .set({ correctiveActionId: created.id })
            .where(eq(auditFinding.id, input.auditFindingId));
        }

        if (input.initialStatus === "pending_approval") {
          const approvers = input.approverUserIdsForPlan?.length
            ? [...new Set(input.approverUserIdsForPlan)]
            : input.approverUserIdForPlan
              ? [input.approverUserIdForPlan]
              : [];
          if (approvers.length > 0) {
            const [req] = await tx
              .insert(approvalRequest)
              .values({
                organizationId: input.organizationId,
                entityType: "capa",
                entityId: created.id,
                status: "open",
                createdByUserId: ctx.user.id,
              })
              .returning();
            if (req) {
              await insertCapaApprovalSteps(tx, {
                organizationId: input.organizationId,
                requestId: req.id,
                correctiveActionId: created.id,
                approverUserIds: approvers,
                actorUserId: ctx.user.id,
                slaDaysPerStep: input.slaDaysPerPlanApproval,
              });
            }
          }
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "capa.create",
          entityType: "corrective_action",
          entityId: created.id,
          payload: {
            title: input.title,
            incidentId: input.incidentId ?? null,
            auditFindingId: input.auditFindingId ?? null,
            environmentalAspectId: input.environmentalAspectId ?? null,
            complianceObligationId: input.complianceObligationId ?? null,
            environmentalRegulatoryPermitId: input.environmentalRegulatoryPermitId ?? null,
            managementReviewId: input.managementReviewId ?? null,
            standalone: sourceCount === 0,
          },
        });

        return created;
      });
    }),

  updateStatus: protectedMutation
    .input(
      orgScope.extend({
        correctiveActionId: z.string().uuid(),
        status: z.enum(capaStatuses),
        verificationNotes: z.string().min(20).max(20_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CAPA_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(correctiveAction)
        .where(
          and(
            eq(correctiveAction.id, input.correctiveActionId),
            eq(correctiveAction.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Corrective action not found.",
        });
      }

      if (
        !allowedCapaTransition(
          existing.status,
          input.status as (typeof correctiveActionStatusEnum.enumValues)[number],
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid CAPA status transition: ${existing.status} → ${input.status}`,
        });
      }

      if (existing.status === "pending_approval" && input.status === "planned") {
        const [approved] = await ctx.db
          .select({ id: approvalRequest.id })
          .from(approvalRequest)
          .where(
            and(
              eq(approvalRequest.organizationId, input.organizationId),
              eq(approvalRequest.entityType, "capa"),
              eq(approvalRequest.entityId, input.correctiveActionId),
              eq(approvalRequest.status, "approved"),
            ),
          )
          .orderBy(desc(approvalRequest.resolvedAt))
          .limit(1);

        if (!approved) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "An approved plan review is required before moving this CAPA to planned. Submit an approval request and have the approver accept it.",
          });
        }
      }

      if (input.status === "verified") {
        const vn = (input.verificationNotes ?? "").trim();
        if (vn.length < 20) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Marking a corrective action verified requires effectiveness / verification notes (at least 20 characters).",
          });
        }
      }

      return ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(correctiveAction)
          .set({
            status: input.status as (typeof correctiveActionStatusEnum.enumValues)[number],
            updatedAt: new Date(),
            ...(input.status === "verified" && input.verificationNotes
              ? {
                  verificationNotes: input.verificationNotes.trim(),
                  verificationPerformedByUserId: ctx.user.id,
                }
              : {}),
          })
          .where(eq(correctiveAction.id, input.correctiveActionId))
          .returning();

        await tx.insert(workflowTransition).values({
          organizationId: input.organizationId,
          entityType: "corrective_action",
          entityId: input.correctiveActionId,
          fromStatus: existing.status,
          toStatus: input.status,
          actorUserId: ctx.user.id,
        });

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "capa.update_status",
          entityType: "corrective_action",
          entityId: input.correctiveActionId,
          payload: {
            from: existing.status,
            to: input.status,
            ...(input.status === "verified" ? { verified: true } : {}),
          },
        });

        return updated;
      });
    }),

  assignOwner: protectedMutation
    .input(
      orgScope.extend({
        correctiveActionId: z.string().uuid(),
        ownerUserId: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CAPA_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(correctiveAction)
        .where(
          and(
            eq(correctiveAction.id, input.correctiveActionId),
            eq(correctiveAction.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Corrective action not found.",
        });
      }

      if (input.ownerUserId) {
        await assertOrgMemberUserId(ctx.db, input.organizationId, input.ownerUserId);
      }

      return ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(correctiveAction)
          .set({
            ownerUserId: input.ownerUserId,
            updatedAt: new Date(),
          })
          .where(eq(correctiveAction.id, input.correctiveActionId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "capa.assign_owner",
          entityType: "corrective_action",
          entityId: input.correctiveActionId,
          payload: { ownerUserId: input.ownerUserId },
        });

        return updated;
      });
    }),
});
