/** @deprecated Use `program.*` KPI procedures on `/dashboard/program` — no dashboard consumer for planning.kpi. */
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  managementObjective,
  objectiveKpiMeasurement,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { protectedMutation, protectedProcedure, router } from "../../init";
import { orgScope } from "../../schemas/orgScope";

export const kpiRouter = router({
  list: protectedProcedure
    .input(
      orgScope.extend({
        managementObjectiveId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.KPI_READ,
      );

      return ctx.db
        .select()
        .from(objectiveKpiMeasurement)
        .where(
          input.managementObjectiveId
            ? and(
                eq(objectiveKpiMeasurement.organizationId, input.organizationId),
                eq(objectiveKpiMeasurement.managementObjectiveId, input.managementObjectiveId),
              )
            : eq(objectiveKpiMeasurement.organizationId, input.organizationId),
        )
        .orderBy(desc(objectiveKpiMeasurement.periodStart));
    }),

  create: protectedMutation
    .input(
      orgScope.extend({
        managementObjectiveId: z.string().uuid(),
        periodStart: z.coerce.date(),
        periodEnd: z.coerce.date(),
        actualValue: z.string().min(1).max(256),
        targetValue: z.string().max(256).optional(),
        unit: z.string().max(64).optional(),
        notes: z.string().max(50_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.KPI_WRITE,
      );

      const [obj] = await ctx.db
        .select()
        .from(managementObjective)
        .where(
          and(
            eq(managementObjective.id, input.managementObjectiveId),
            eq(managementObjective.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!obj) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Objective not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(objectiveKpiMeasurement)
          .values({
            organizationId: input.organizationId,
            managementObjectiveId: input.managementObjectiveId,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            actualValue: input.actualValue,
            targetValue: input.targetValue ?? null,
            unit: input.unit ?? null,
            notes: input.notes ?? null,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create KPI measurement.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "planning.kpi.create",
          entityType: "objective_kpi_measurement",
          entityId: row.id,
          payload: { managementObjectiveId: input.managementObjectiveId },
        });

        return row;
      });
    }),
});
