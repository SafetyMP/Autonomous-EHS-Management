import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { PERMISSIONS, assertPermission, userHasPermission } from "@/lib/rbac";
import { complianceMetricSnapshot } from "@/server/db/schema";
import {
  computeOrgTrirInputs,
  persistTrirSnapshot,
} from "@/server/services/complianceMetricTrir";
import { fetchRecordableInvestigationThemes } from "@/server/services/complianceRecordableDrivers";
import { writeAuditLog } from "@/server/services/audit";
import { assertEstablishmentInOrg } from "../assertOrgScoped";
import { protectedMutation, protectedProcedure, router } from "../init";
import { orgScope } from "../schemas/orgScope";

export const complianceMetricsRouter = router({
  listTrirSnapshots: protectedProcedure
    .input(
      orgScope.extend({
        calendarYear: z.number().int().min(2000).max(2100).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ESTABLISHMENT_READ,
      );
      const lim = input.limit ?? 50;
      const cond = [
        eq(complianceMetricSnapshot.organizationId, input.organizationId),
        eq(complianceMetricSnapshot.metricKey, "trir"),
      ];
      if (input.calendarYear !== undefined) {
        cond.push(eq(complianceMetricSnapshot.calendarYear, input.calendarYear));
      }
      return ctx.db
        .select()
        .from(complianceMetricSnapshot)
        .where(and(...cond))
        .orderBy(desc(complianceMetricSnapshot.createdAt))
        .limit(lim);
    }),

  computeTrirSnapshot: protectedMutation
    .input(
      orgScope.extend({
        calendarYear: z.number().int().min(2000).max(2100),
        establishmentId: z.string().uuid().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ESTABLISHMENT_READ,
      );
      if (input.establishmentId) {
        await assertEstablishmentInOrg(
          ctx.db,
          input.organizationId,
          input.establishmentId,
        );
      }
      const inputs = await computeOrgTrirInputs(ctx.db, {
        organizationId: input.organizationId,
        calendarYear: input.calendarYear,
        establishmentId: input.establishmentId,
      });
      const row = await persistTrirSnapshot(ctx.db, inputs, ctx.user.id);

      const periodStartUtc = new Date(Date.UTC(input.calendarYear, 0, 1)).toISOString();
      const periodEndUtc = new Date(
        Date.UTC(input.calendarYear, 11, 31, 23, 59, 59, 999),
      ).toISOString();

      await writeAuditLog(ctx.db, {
        organizationId: input.organizationId,
        actorUserId: ctx.user.id,
        action: "compliance_metrics.trir_snapshot_compute",
        entityType: "compliance_metric_snapshot",
        entityId: row.id,
        payload: {
          organizationId: input.organizationId,
          snapshotId: row.id,
          calendarYear: input.calendarYear,
          periodStartUtc,
          periodEndUtc,
          establishmentId: inputs.establishmentId,
          inputsHash: row.inputsHash,
        },
      });

      return row;
    }),

  recordableInvestigationThemes: protectedProcedure
    .input(
      orgScope.extend({
        calendarYear: z.number().int().min(2000).max(2100),
        establishmentId: z.string().uuid().optional().nullable(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ESTABLISHMENT_READ,
      );
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INCIDENT_READ,
      );
      if (input.establishmentId) {
        await assertEstablishmentInOrg(
          ctx.db,
          input.organizationId,
          input.establishmentId,
        );
      }

      const readSensitive = await userHasPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INCIDENT_READ_SENSITIVE,
      );

      return fetchRecordableInvestigationThemes(ctx.db, {
        organizationId: input.organizationId,
        calendarYear: input.calendarYear,
        establishmentId: input.establishmentId ?? null,
        includeRootCauseSummary: readSensitive,
      });
    }),
});
