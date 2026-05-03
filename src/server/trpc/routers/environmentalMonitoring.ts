import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  complianceObligation,
  environmentalAspect,
  environmentalMonitoringResult,
  site,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

export const environmentalMonitoringRouter = router({
  list: protectedProcedure
    .input(
      orgScope.extend({
        environmentalAspectId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ENV_MONITORING_READ,
      );

      return ctx.db
        .select()
        .from(environmentalMonitoringResult)
        .where(
          input.environmentalAspectId
            ? and(
                eq(environmentalMonitoringResult.organizationId, input.organizationId),
                eq(
                  environmentalMonitoringResult.environmentalAspectId,
                  input.environmentalAspectId,
                ),
              )
            : eq(environmentalMonitoringResult.organizationId, input.organizationId),
        )
        .orderBy(desc(environmentalMonitoringResult.measuredAt));
    }),

  create: protectedMutation
    .input(
      orgScope.extend({
        siteId: z.string().uuid().optional(),
        environmentalAspectId: z.string().uuid().optional(),
        complianceObligationId: z.string().uuid().optional(),
        parameterName: z.string().min(1).max(256),
        measuredAt: z.coerce.date(),
        valueText: z.string().min(1).max(256),
        unit: z.string().max(64).optional(),
        legalLimitText: z.string().max(256).optional(),
        methodNote: z.string().max(50_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ENV_MONITORING_WRITE,
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
          throw new TRPCError({ code: "BAD_REQUEST", message: "Aspect not found." });
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
          throw new TRPCError({ code: "BAD_REQUEST", message: "Obligation not found." });
        }
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(environmentalMonitoringResult)
          .values({
            organizationId: input.organizationId,
            siteId: input.siteId ?? null,
            environmentalAspectId: input.environmentalAspectId ?? null,
            complianceObligationId: input.complianceObligationId ?? null,
            parameterName: input.parameterName,
            measuredAt: input.measuredAt,
            valueText: input.valueText,
            unit: input.unit ?? null,
            legalLimitText: input.legalLimitText ?? null,
            methodNote: input.methodNote ?? null,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create monitoring result.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "environmental_monitoring.create",
          entityType: "environmental_monitoring_result",
          entityId: row.id,
          payload: { parameterName: input.parameterName },
        });

        return row;
      });
    }),
});
