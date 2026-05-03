import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { integrationEvent } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { persistTrainingCompletionEvent } from "@/server/services/trainingCompletionIngest";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

export const integrationRouter = router({
  listEvents: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.INTEGRATION_READ);
    return ctx.db
      .select()
      .from(integrationEvent)
      .where(eq(integrationEvent.organizationId, input.organizationId))
      .orderBy(desc(integrationEvent.createdAt))
      .limit(100);
  }),

  enqueueTestEvent: protectedMutation
    .input(orgScope.extend({ eventType: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.INTEGRATION_WRITE);
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(integrationEvent)
          .values({
            organizationId: input.organizationId,
            eventType: input.eventType,
            payload: { source: "manual_test", at: new Date().toISOString() },
          })
          .returning();
        if (row) {
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "integration.enqueue",
            entityType: "integration_event",
            entityId: row.id,
          });
        }
        return row;
      });
    }),

  ingestTrainingCompletion: protectedMutation
    .input(
      z.object({
        organizationId: z.string().uuid(),
        externalWorkerId: z.string().min(1).max(256),
        courseCode: z.string().min(1).max(128),
        completedAt: z.coerce.date(),
        issuer: z.string().min(1).max(128),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INTEGRATION_WRITE,
      );
      return persistTrainingCompletionEvent(ctx.db, input, ctx.user.id);
    }),
});
