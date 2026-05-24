/**
 * @deprecated Dashboard uses `program.*Emergency*` procedures. This router remains for
 * API/tests and drill→incident/CAPA links; prefer `/dashboard/program` for operator UX.
 */
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  correctiveAction,
  emergencyDrill,
  emergencyScenario,
  incident,
  site,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

export const emergencyRouter = router({
  listScenarios: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.EMERGENCY_READ,
    );

    return ctx.db
      .select()
      .from(emergencyScenario)
      .where(eq(emergencyScenario.organizationId, input.organizationId))
      .orderBy(desc(emergencyScenario.createdAt));
  }),

  createScenario: protectedMutation
    .input(
      orgScope.extend({
        siteId: z.string().uuid().optional(),
        name: z.string().min(2).max(512),
        description: z.string().max(50_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.EMERGENCY_WRITE,
      );

      if (input.siteId) {
        const [s] = await ctx.db
          .select()
          .from(site)
          .where(
            and(eq(site.id, input.siteId), eq(site.organizationId, input.organizationId)),
          )
          .limit(1);
        if (!s) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Site does not belong to organization.",
          });
        }
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(emergencyScenario)
          .values({
            organizationId: input.organizationId,
            siteId: input.siteId ?? null,
            name: input.name,
            description: input.description ?? null,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create scenario.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "emergency.scenario.create",
          entityType: "emergency_scenario",
          entityId: row.id,
          payload: { name: input.name },
        });

        return row;
      });
    }),

  listDrills: protectedProcedure
    .input(orgScope.extend({ scenarioId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.EMERGENCY_READ,
      );

      return ctx.db
        .select()
        .from(emergencyDrill)
        .where(
          input.scenarioId
            ? and(
                eq(emergencyDrill.organizationId, input.organizationId),
                eq(emergencyDrill.scenarioId, input.scenarioId),
              )
            : eq(emergencyDrill.organizationId, input.organizationId),
        )
        .orderBy(desc(emergencyDrill.drillDate));
    }),

  createDrill: protectedMutation
    .input(
      orgScope.extend({
        scenarioId: z.string().uuid(),
        drillDate: z.coerce.date(),
        outcomeSummary: z.string().max(50_000).optional(),
        attendeesNote: z.string().max(50_000).optional(),
        relatedIncidentId: z.string().uuid().optional(),
        relatedCorrectiveActionId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.EMERGENCY_WRITE,
      );

      const [sc] = await ctx.db
        .select()
        .from(emergencyScenario)
        .where(
          and(
            eq(emergencyScenario.id, input.scenarioId),
            eq(emergencyScenario.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!sc) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Scenario not found." });
      }

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
      if (input.relatedCorrectiveActionId) {
        const [c] = await ctx.db
          .select()
          .from(correctiveAction)
          .where(
            and(
              eq(correctiveAction.id, input.relatedCorrectiveActionId),
              eq(correctiveAction.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!c) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "CAPA not found." });
        }
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(emergencyDrill)
          .values({
            organizationId: input.organizationId,
            scenarioId: input.scenarioId,
            drillDate: input.drillDate,
            outcomeSummary: input.outcomeSummary ?? null,
            attendeesNote: input.attendeesNote ?? null,
            relatedIncidentId: input.relatedIncidentId ?? null,
            relatedCorrectiveActionId: input.relatedCorrectiveActionId ?? null,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create drill record.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "emergency.drill.create",
          entityType: "emergency_drill",
          entityId: row.id,
          payload: { scenarioId: input.scenarioId },
        });

        return row;
      });
    }),
});
