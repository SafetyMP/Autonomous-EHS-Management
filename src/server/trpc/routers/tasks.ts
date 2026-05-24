import { z } from "zod";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  queryActionQueue,
  queryActionQueueCounts,
} from "@/server/services/tasks/actionQueueQuery";
import { orgScope } from "../schemas/orgScope";
import { protectedProcedure, router } from "../init";
import { and, eq, isNotNull, lte, or } from "drizzle-orm";
import {
  complianceObligation,
  correctiveAction,
  managementReview,
  trainingRecord,
} from "@/server/db/schema";

export const tasksRouter = router({
  myOpenItems: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.TASKS_READ);

    const now = new Date();
    const trainingHorizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const capas = await ctx.db
      .select({
        id: correctiveAction.id,
        title: correctiveAction.title,
        status: correctiveAction.status,
        dueDate: correctiveAction.dueDate,
      })
      .from(correctiveAction)
      .where(
        and(
          eq(correctiveAction.organizationId, input.organizationId),
          eq(correctiveAction.ownerUserId, ctx.user.id),
          or(
            eq(correctiveAction.status, "pending_approval"),
            eq(correctiveAction.status, "planned"),
            eq(correctiveAction.status, "in_progress"),
          ),
        ),
      );

    const overdueObligations = await ctx.db
      .select({
        id: complianceObligation.id,
        title: complianceObligation.title,
        due: complianceObligation.nextReviewDue,
      })
      .from(complianceObligation)
      .where(
        and(
          eq(complianceObligation.organizationId, input.organizationId),
          lte(complianceObligation.nextReviewDue, now),
          isNotNull(complianceObligation.nextReviewDue),
        ),
      )
      .limit(25);

    const upcomingTraining = await ctx.db
      .select({
        id: trainingRecord.id,
        courseTitle: trainingRecord.courseTitle,
        expiresOn: trainingRecord.expiresOn,
      })
      .from(trainingRecord)
      .where(
        and(
          eq(trainingRecord.organizationId, input.organizationId),
          eq(trainingRecord.userId, ctx.user.id),
          lte(trainingRecord.expiresOn, trainingHorizon),
          isNotNull(trainingRecord.expiresOn),
        ),
      );

    const reviews = await ctx.db
      .select({
        id: managementReview.id,
        summary: managementReview.summary,
        due: managementReview.nextReviewDue,
      })
      .from(managementReview)
      .where(
        and(
          eq(managementReview.organizationId, input.organizationId),
          lte(managementReview.nextReviewDue, now),
          isNotNull(managementReview.nextReviewDue),
        ),
      )
      .limit(25);

    return {
      capas,
      overdueObligations,
      upcomingTraining,
      overdueManagementReviews: reviews,
    };
  }),

  actionQueue: protectedProcedure
    .input(
      orgScope.extend({
        limit: z.number().int().min(1).max(20).default(5),
        includeOrgWide: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.TASKS_READ);
      return queryActionQueue(ctx.db, input.organizationId, ctx.user.id, {
        limit: input.limit,
        includeOrgWide: input.includeOrgWide,
      });
    }),

  actionQueueCounts: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.TASKS_READ);
    return queryActionQueueCounts(ctx.db, input.organizationId, ctx.user.id);
  }),
});
