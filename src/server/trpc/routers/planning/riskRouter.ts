import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { riskAssessment, riskRatingEnum } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { assertHazardInOrg } from "../../assertOrgScoped";
import { protectedMutation, protectedProcedure, router } from "../../init";
import { orgScope } from "../../schemas/orgScope";
import { riskRatings } from "./planningEnums";

export const riskRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.RISK_READ,
    );

    return ctx.db
      .select()
      .from(riskAssessment)
      .where(eq(riskAssessment.organizationId, input.organizationId))
      .orderBy(desc(riskAssessment.assessedAt));
  }),

  create: protectedMutation
    .input(
      orgScope.extend({
        hazardId: z.string().uuid().optional(),
        context: z.string().min(10).max(50_000),
        existingControls: z.string().max(50_000).optional(),
        inherentRating: z.enum(riskRatings).optional(),
        likelihoodScore: z.number().int().min(1).max(25).optional(),
        consequenceScore: z.number().int().min(1).max(25).optional(),
        residualRating: z.enum(riskRatings).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.RISK_CREATE,
      );

      if (input.hazardId) {
        await assertHazardInOrg(ctx.db, input.organizationId, input.hazardId);
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(riskAssessment)
          .values({
            organizationId: input.organizationId,
            hazardId: input.hazardId ?? null,
            context: input.context,
            existingControls: input.existingControls ?? null,
            inherentRating:
              (input.inherentRating as (typeof riskRatingEnum.enumValues)[number] | undefined) ??
              null,
            likelihoodScore: input.likelihoodScore ?? null,
            consequenceScore: input.consequenceScore ?? null,
            residualRating:
              (input.residualRating as (typeof riskRatingEnum.enumValues)[number]) ?? "medium",
            assessedByUserId: ctx.user.id,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create risk assessment.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "planning.risk.create",
          entityType: "risk_assessment",
          entityId: row.id,
          payload: { hazardId: input.hazardId ?? null },
        });

        return row;
      });
    }),

  update: protectedMutation
    .input(
      orgScope.extend({
        riskAssessmentId: z.string().uuid(),
        context: z.string().min(10).max(50_000).optional(),
        existingControls: z.string().max(50_000).optional().nullable(),
        inherentRating: z.enum(riskRatings).optional().nullable(),
        likelihoodScore: z.number().int().min(1).max(25).optional().nullable(),
        consequenceScore: z.number().int().min(1).max(25).optional().nullable(),
        residualRating: z.enum(riskRatings).optional(),
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

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(riskAssessment)
          .set({
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
          })
          .where(eq(riskAssessment.id, input.riskAssessmentId))
          .returning();

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
});
