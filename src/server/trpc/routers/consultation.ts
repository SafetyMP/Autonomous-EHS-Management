import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { consultationRecord, incident, managementObjective } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

export const consultationRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.CONSULTATION_RECORD_READ,
    );

    return ctx.db
      .select()
      .from(consultationRecord)
      .where(eq(consultationRecord.organizationId, input.organizationId))
      .orderBy(desc(consultationRecord.consultedAt));
  }),

  create: protectedMutation
    .input(
      orgScope.extend({
        topic: z.string().min(2).max(512),
        consultedAt: z.coerce.date(),
        outcomeSummary: z.string().max(50_000).optional(),
        relatedIncidentId: z.string().uuid().optional(),
        relatedObjectiveId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CONSULTATION_RECORD_WRITE,
      );

      if (input.relatedIncidentId) {
        const [i] = await ctx.db
          .select()
          .from(incident)
          .where(
            and(
              eq(incident.id, input.relatedIncidentId),
              eq(incident.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!i) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Incident not found." });
        }
      }
      if (input.relatedObjectiveId) {
        const [o] = await ctx.db
          .select()
          .from(managementObjective)
          .where(
            and(
              eq(managementObjective.id, input.relatedObjectiveId),
              eq(managementObjective.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!o) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Objective not found." });
        }
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(consultationRecord)
          .values({
            organizationId: input.organizationId,
            topic: input.topic,
            consultedAt: input.consultedAt,
            outcomeSummary: input.outcomeSummary ?? null,
            relatedIncidentId: input.relatedIncidentId ?? null,
            relatedObjectiveId: input.relatedObjectiveId ?? null,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create consultation record.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "consultation.create",
          entityType: "consultation_record",
          entityId: row.id,
          payload: { topic: input.topic },
        });

        return row;
      });
    }),
});
