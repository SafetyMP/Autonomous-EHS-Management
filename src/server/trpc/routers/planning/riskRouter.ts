import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  riskAssessment,
  riskAssessmentKindEnum,
  riskAssessmentStatusEnum,
  riskAssessmentStep,
  riskRatingEnum,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { computeDefaultRetainUntilForProgramRecord } from "@/server/services/incidentRetentionDefault";
import { runWithMutationIdempotency } from "@/server/services/mutationIdempotency";
import { assertHazardInOrg, assertSiteInOrg } from "../../assertOrgScoped";
import { protectedMutation, protectedProcedure, router } from "../../init";
import { orgScope } from "../../schemas/orgScope";
import { riskAssessmentKinds, riskAssessmentStatuses, riskRatings } from "./planningEnums";

const stepInput = z.object({
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  taskDescription: z.string().min(1).max(50_000),
  hazardText: z.string().min(1).max(50_000),
  controlsText: z.string().max(50_000).optional().nullable(),
  inherentRating: z.enum(riskRatings).optional().nullable(),
  residualRating: z.enum(riskRatings).optional().nullable(),
});

export const riskRouter = router({
  list: protectedProcedure
    .input(
      orgScope.extend({
        assessmentKind: z.enum(riskAssessmentKinds).optional(),
        siteId: z.string().uuid().optional(),
        hazardId: z.string().uuid().optional(),
        status: z.enum(riskAssessmentStatuses).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.RISK_READ,
      );

      const parts = [eq(riskAssessment.organizationId, input.organizationId)];
      if (input.assessmentKind) {
        parts.push(
          eq(
            riskAssessment.assessmentKind,
            input.assessmentKind as (typeof riskAssessmentKindEnum.enumValues)[number],
          ),
        );
      }
      if (input.siteId) {
        parts.push(eq(riskAssessment.siteId, input.siteId));
      }
      if (input.hazardId) {
        parts.push(eq(riskAssessment.hazardId, input.hazardId));
      }
      if (input.status) {
        parts.push(
          eq(riskAssessment.status, input.status as (typeof riskAssessmentStatusEnum.enumValues)[number]),
        );
      }

      return ctx.db
        .select()
        .from(riskAssessment)
        .where(and(...parts))
        .orderBy(desc(riskAssessment.assessedAt));
    }),

  get: protectedProcedure
    .input(orgScope.extend({ riskAssessmentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.RISK_READ,
      );

      const [assessment] = await ctx.db
        .select()
        .from(riskAssessment)
        .where(
          and(
            eq(riskAssessment.id, input.riskAssessmentId),
            eq(riskAssessment.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!assessment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Risk assessment not found." });
      }

      const steps = await ctx.db
        .select()
        .from(riskAssessmentStep)
        .where(eq(riskAssessmentStep.riskAssessmentId, input.riskAssessmentId))
        .orderBy(asc(riskAssessmentStep.sortOrder));

      return { assessment, steps };
    }),

  create: protectedMutation
    .input(
      orgScope.extend({
        hazardId: z.string().uuid().optional(),
        siteId: z.string().uuid().optional(),
        summaryTitle: z.string().max(512).optional().nullable(),
        assessmentKind: z.enum(riskAssessmentKinds).optional(),
        status: z.enum(riskAssessmentStatuses).optional(),
        reviewDueAt: z.coerce.date().optional().nullable(),
        context: z.string().min(10).max(50_000),
        existingControls: z.string().max(50_000).optional(),
        inherentRating: z.enum(riskRatings).optional(),
        likelihoodScore: z.number().int().min(1).max(25).optional(),
        consequenceScore: z.number().int().min(1).max(25).optional(),
        residualRating: z.enum(riskRatings).optional(),
        steps: z.array(stepInput).max(200).optional(),
        idempotencyKey: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.RISK_CREATE,
      );

      const { idempotencyKey, ...riskInput } = input;

      const assessmentKind = riskInput.assessmentKind ?? "general";
      if (riskInput.hazardId) {
        await assertHazardInOrg(ctx.db, input.organizationId, riskInput.hazardId);
      }
      if (riskInput.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, riskInput.siteId);
      }

      if (assessmentKind === "task_based") {
        if (!riskInput.steps || riskInput.steps.length < 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Task-based assessments require at least one step.",
          });
        }
      }
      if (assessmentKind === "site_based" && !riskInput.siteId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Site-based assessments require siteId.",
        });
      }

      const retainUntilDefault = await computeDefaultRetainUntilForProgramRecord(
        ctx.db,
        input.organizationId,
        new Date(),
        "risk_assessment_program",
      );

      return ctx.db.transaction(async (tx) =>
        runWithMutationIdempotency(
          tx,
          {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            idempotencyKey,
            procedure: "planning.risk.create",
          },
          async () => {
            const [row] = await tx
              .insert(riskAssessment)
              .values({
                organizationId: riskInput.organizationId,
                siteId: riskInput.siteId ?? null,
                hazardId: riskInput.hazardId ?? null,
                summaryTitle: riskInput.summaryTitle?.trim() ?? null,
                assessmentKind:
                  assessmentKind as (typeof riskAssessmentKindEnum.enumValues)[number],
                status:
                  (riskInput.status ?? "active") as (typeof riskAssessmentStatusEnum.enumValues)[number],
                reviewDueAt: riskInput.reviewDueAt ?? null,
                context: riskInput.context,
                existingControls: riskInput.existingControls ?? null,
                inherentRating:
                  (riskInput.inherentRating as (typeof riskRatingEnum.enumValues)[number] | undefined) ?? null,
                likelihoodScore: riskInput.likelihoodScore ?? null,
                consequenceScore: riskInput.consequenceScore ?? null,
                residualRating:
                  (riskInput.residualRating as (typeof riskRatingEnum.enumValues)[number]) ?? "medium",
                assessedByUserId: ctx.user.id,
                retainUntil: retainUntilDefault,
              })
              .returning();

            if (!row) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to create risk assessment.",
              });
            }

            if (riskInput.steps?.length) {
              await tx.insert(riskAssessmentStep).values(
                riskInput.steps.map((s, i) => ({
                  riskAssessmentId: row.id,
                  sortOrder: s.sortOrder ?? i,
                  taskDescription: s.taskDescription.trim(),
                  hazardText: s.hazardText.trim(),
                  controlsText: s.controlsText?.trim() ?? null,
                  inherentRating:
                    (s.inherentRating ?? null) as (typeof riskRatingEnum.enumValues)[number] | null,
                  residualRating:
                    (s.residualRating ?? null) as (typeof riskRatingEnum.enumValues)[number] | null,
                })),
              );
            }

            await writeAuditLog(tx, {
              organizationId: riskInput.organizationId,
              actorUserId: ctx.user.id,
              action: "planning.risk.create",
              entityType: "risk_assessment",
              entityId: row.id,
              payload: { hazardId: riskInput.hazardId ?? null, assessmentKind },
            });

            return row;
          },
        ),
      );
    }),

  update: protectedMutation
    .input(
      orgScope.extend({
        riskAssessmentId: z.string().uuid(),
        hazardId: z.string().uuid().optional().nullable(),
        siteId: z.string().uuid().optional().nullable(),
        summaryTitle: z.string().max(512).optional().nullable(),
        assessmentKind: z.enum(riskAssessmentKinds).optional(),
        status: z.enum(riskAssessmentStatuses).optional(),
        reviewDueAt: z.coerce.date().optional().nullable(),
        context: z.string().min(10).max(50_000).optional(),
        existingControls: z.string().max(50_000).optional().nullable(),
        inherentRating: z.enum(riskRatings).optional().nullable(),
        likelihoodScore: z.number().int().min(1).max(25).optional().nullable(),
        consequenceScore: z.number().int().min(1).max(25).optional().nullable(),
        residualRating: z.enum(riskRatings).optional(),
        replaceSteps: z.array(stepInput).max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.RISK_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(riskAssessment)
        .where(
          and(
            eq(riskAssessment.id, input.riskAssessmentId),
            eq(riskAssessment.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Risk assessment not found." });
      }

      const nextKind = input.assessmentKind ?? existing.assessmentKind;
      if (input.hazardId) {
        await assertHazardInOrg(ctx.db, input.organizationId, input.hazardId);
      }
      const nextSiteId = input.siteId !== undefined ? input.siteId : existing.siteId;
      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }

      if (nextKind === "task_based") {
        const stepCount =
          input.replaceSteps !== undefined
            ? input.replaceSteps.length
            : (
                await ctx.db
                  .select({ id: riskAssessmentStep.id })
                  .from(riskAssessmentStep)
                  .where(eq(riskAssessmentStep.riskAssessmentId, input.riskAssessmentId))
              ).length;
        if (stepCount < 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Task-based assessments require at least one step.",
          });
        }
      }
      if (nextKind === "site_based" && !nextSiteId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Site-based assessments require siteId.",
        });
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(riskAssessment)
          .set({
            hazardId: input.hazardId !== undefined ? input.hazardId : existing.hazardId,
            siteId: input.siteId !== undefined ? input.siteId : existing.siteId,
            summaryTitle:
              input.summaryTitle !== undefined ? input.summaryTitle?.trim() ?? null : existing.summaryTitle,
            assessmentKind: nextKind as (typeof riskAssessmentKindEnum.enumValues)[number],
            status:
              input.status !== undefined
                ? (input.status as (typeof riskAssessmentStatusEnum.enumValues)[number])
                : existing.status,
            reviewDueAt:
              input.reviewDueAt !== undefined ? input.reviewDueAt : existing.reviewDueAt,
            context: input.context ?? existing.context,
            existingControls:
              input.existingControls !== undefined
                ? input.existingControls
                : existing.existingControls,
            inherentRating:
              input.inherentRating !== undefined
                ? (input.inherentRating as (typeof riskRatingEnum.enumValues)[number] | null)
                : existing.inherentRating,
            likelihoodScore:
              input.likelihoodScore !== undefined
                ? input.likelihoodScore
                : existing.likelihoodScore,
            consequenceScore:
              input.consequenceScore !== undefined
                ? input.consequenceScore
                : existing.consequenceScore,
            residualRating:
              (input.residualRating as (typeof riskRatingEnum.enumValues)[number] | undefined) ??
              existing.residualRating,
            assessedByUserId: ctx.user.id,
            assessedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(riskAssessment.id, input.riskAssessmentId))
          .returning();

        if (input.replaceSteps !== undefined) {
          await tx
            .delete(riskAssessmentStep)
            .where(eq(riskAssessmentStep.riskAssessmentId, input.riskAssessmentId));
          if (input.replaceSteps.length > 0) {
            await tx.insert(riskAssessmentStep).values(
              input.replaceSteps.map((s, i) => ({
                riskAssessmentId: input.riskAssessmentId,
                sortOrder: s.sortOrder ?? i,
                taskDescription: s.taskDescription.trim(),
                hazardText: s.hazardText.trim(),
                controlsText: s.controlsText?.trim() ?? null,
                inherentRating: (s.inherentRating ?? null) as (typeof riskRatingEnum.enumValues)[number] | null,
                residualRating: (s.residualRating ?? null) as (typeof riskRatingEnum.enumValues)[number] | null,
              })),
            );
          }
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "planning.risk.update",
          entityType: "risk_assessment",
          entityId: input.riskAssessmentId,
          payload: {},
        });

        return row;
      });
    }),

  setProgramRetention: protectedMutation
    .input(
      orgScope
        .extend({
          riskAssessmentId: z.string().uuid(),
          retainUntil: z.coerce.date().nullable().optional(),
          legalHold: z.boolean().optional(),
        })
        .refine((i) => i.retainUntil !== undefined || i.legalHold !== undefined, {
          message: "Provide retainUntil and/or legalHold.",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.RISK_READ);
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.RETENTION_POLICY_WRITE,
      );
      const [existing] = await ctx.db
        .select()
        .from(riskAssessment)
        .where(
          and(
            eq(riskAssessment.id, input.riskAssessmentId),
            eq(riskAssessment.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Risk assessment not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const [upd] = await tx
          .update(riskAssessment)
          .set({
            retainUntil:
              input.retainUntil !== undefined ? (input.retainUntil ?? null) : existing.retainUntil,
            legalHold: input.legalHold !== undefined ? input.legalHold : existing.legalHold,
            updatedAt: new Date(),
          })
          .where(eq(riskAssessment.id, existing.id))
          .returning();
        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "planning.risk.set_program_retention",
          entityType: "risk_assessment",
          entityId: existing.id,
          payload: {
            retainUntil:
              input.retainUntil !== undefined ? (input.retainUntil?.toISOString() ?? null) : undefined,
            legalHold: input.legalHold,
          },
        });
        return upd;
      });
    }),
});
