import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  dataRetentionActionEnum,
  dataRetentionPolicy,
  dataRetentionRecordClassEnum,
  retentionDateAnchorEnum,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

const jurisdictions = z.string().min(1).max(64);
const recordClasses = dataRetentionRecordClassEnum.enumValues as [string, ...string[]];
const actions = dataRetentionActionEnum.enumValues as [string, ...string[]];
const retentionAnchors = retentionDateAnchorEnum.enumValues as [string, ...string[]];

export const dataRetentionRouter = router({
  listPolicies: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.RETENTION_POLICY_READ,
    );

    return ctx.db
      .select()
      .from(dataRetentionPolicy)
      .where(eq(dataRetentionPolicy.organizationId, input.organizationId))
      .orderBy(desc(dataRetentionPolicy.updatedAt));
  }),

  upsertPolicy: protectedMutation
    .input(
      orgScope.extend({
        jurisdiction: jurisdictions,
        recordClass: z.enum(recordClasses),
        minimumYears: z.number().int().min(0).max(200),
        action: z.enum(actions),
        retentionDateAnchor: z.enum(retentionAnchors).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.RETENTION_POLICY_WRITE,
      );

      return ctx.db.transaction(async (tx) => {
        const recordClass = input.recordClass as (typeof dataRetentionRecordClassEnum.enumValues)[number];

        const [existing] = await tx
          .select()
          .from(dataRetentionPolicy)
          .where(
            and(
              eq(dataRetentionPolicy.organizationId, input.organizationId),
              eq(dataRetentionPolicy.jurisdiction, input.jurisdiction),
              eq(dataRetentionPolicy.recordClass, recordClass),
            ),
          )
          .limit(1);

        const action = input.action as (typeof dataRetentionActionEnum.enumValues)[number];

        if (existing) {
          const retentionDateAnchor =
            input.retentionDateAnchor !== undefined
              ? (input.retentionDateAnchor as (typeof retentionDateAnchorEnum.enumValues)[number])
              : existing.retentionDateAnchor;

          const [updated] = await tx
            .update(dataRetentionPolicy)
            .set({
              minimumYears: input.minimumYears,
              action,
              retentionDateAnchor,
              updatedAt: new Date(),
            })
            .where(eq(dataRetentionPolicy.id, existing.id))
            .returning();

          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "data_retention_policy.update",
            entityType: "data_retention_policy",
            entityId: existing.id,
            payload: {
              jurisdiction: input.jurisdiction,
              recordClass: input.recordClass,
              retentionDateAnchor,
            },
          });

          return updated;
        }

        const retentionDateAnchor =
          (input.retentionDateAnchor as (typeof retentionDateAnchorEnum.enumValues)[number] | undefined) ??
          "rolling_from_event";

        const [inserted] = await tx
          .insert(dataRetentionPolicy)
          .values({
            organizationId: input.organizationId,
            jurisdiction: input.jurisdiction,
            recordClass,
            minimumYears: input.minimumYears,
            action,
            retentionDateAnchor,
          })
          .returning();

        if (!inserted) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create retention policy.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "data_retention_policy.create",
          entityType: "data_retention_policy",
          entityId: inserted.id,
          payload: {
            jurisdiction: input.jurisdiction,
            recordClass: input.recordClass,
            retentionDateAnchor,
          },
        });

        return inserted;
      });
    }),
});
