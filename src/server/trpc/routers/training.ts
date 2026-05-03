import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { trainingRecord } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

export const trainingRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.TRAINING_READ,
    );

    return ctx.db
      .select()
      .from(trainingRecord)
      .where(eq(trainingRecord.organizationId, input.organizationId))
      .orderBy(desc(trainingRecord.completedOn), desc(trainingRecord.createdAt));
  }),

  create: protectedMutation
    .input(
      orgScope.extend({
        traineeName: z.string().min(1).max(256),
        userId: z.string().optional(),
        courseTitle: z.string().min(2).max(512),
        completedOn: z.coerce.date().optional(),
        expiresOn: z.coerce.date().optional(),
        evidenceNote: z.string().max(50_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.TRAINING_CREATE,
      );

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(trainingRecord)
          .values({
            organizationId: input.organizationId,
            traineeName: input.traineeName,
            userId: input.userId ?? null,
            courseTitle: input.courseTitle,
            completedOn: input.completedOn ?? null,
            expiresOn: input.expiresOn ?? null,
            evidenceNote: input.evidenceNote ?? null,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create training record.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "training.create",
          entityType: "training_record",
          entityId: row.id,
          payload: { courseTitle: input.courseTitle },
        });

        return row;
      });
    }),

  update: protectedMutation
    .input(
      orgScope.extend({
        recordId: z.string().uuid(),
        traineeName: z.string().min(1).max(256).optional(),
        userId: z.string().optional().nullable(),
        courseTitle: z.string().min(2).max(512).optional(),
        completedOn: z.coerce.date().optional().nullable(),
        expiresOn: z.coerce.date().optional().nullable(),
        evidenceNote: z.string().max(50_000).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.TRAINING_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(trainingRecord)
        .where(
          and(
            eq(trainingRecord.id, input.recordId),
            eq(trainingRecord.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Training record not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(trainingRecord)
          .set({
            traineeName: input.traineeName ?? existing.traineeName,
            userId: input.userId !== undefined ? input.userId : existing.userId,
            courseTitle: input.courseTitle ?? existing.courseTitle,
            completedOn:
              input.completedOn !== undefined ? input.completedOn : existing.completedOn,
            expiresOn: input.expiresOn !== undefined ? input.expiresOn : existing.expiresOn,
            evidenceNote:
              input.evidenceNote !== undefined ? input.evidenceNote : existing.evidenceNote,
          })
          .where(eq(trainingRecord.id, input.recordId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "training.update",
          entityType: "training_record",
          entityId: input.recordId,
          payload: { courseTitle: row?.courseTitle },
        });

        return row;
      });
    }),
});
