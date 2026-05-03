import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  certificationBodyAudit,
  emergencyDrill,
  emergencyScenario,
  externalParty,
  externalPartyTypeEnum,
  kpiDefinition,
  managementCertificate,
  managementOfChange,
  measurementRecord,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

const partyTypes = externalPartyTypeEnum.enumValues as [string, ...string[]];

export const programRouter = router({
  listExternalParties: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.EXTERNAL_PARTY_READ);
    return ctx.db
      .select()
      .from(externalParty)
      .where(eq(externalParty.organizationId, input.organizationId))
      .orderBy(desc(externalParty.createdAt));
  }),

  createExternalParty: protectedMutation
    .input(
      orgScope.extend({
        partyType: z.enum(partyTypes),
        companyName: z.string().min(1).max(512),
        siteId: z.string().uuid().optional(),
        contactName: z.string().max(256).optional(),
        contactEmail: z.string().email().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.EXTERNAL_PARTY_WRITE);
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(externalParty)
          .values({
            organizationId: input.organizationId,
            siteId: input.siteId ?? null,
            partyType: input.partyType as (typeof externalPartyTypeEnum.enumValues)[number],
            companyName: input.companyName,
            contactName: input.contactName ?? null,
            contactEmail: input.contactEmail ?? null,
          })
          .returning();
        if (row) {
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "external_party.create",
            entityType: "external_party",
            entityId: row.id,
          });
        }
        return row;
      });
    }),

  listEmergencyScenarios: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.EMERGENCY_READ);
    return ctx.db
      .select()
      .from(emergencyScenario)
      .where(eq(emergencyScenario.organizationId, input.organizationId));
  }),

  createEmergencyScenario: protectedMutation
    .input(orgScope.extend({ name: z.string().min(1).max(512), description: z.string().max(20_000).optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.EMERGENCY_WRITE);
      const [row] = await ctx.db
        .insert(emergencyScenario)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          description: input.description ?? null,
        })
        .returning();
      return row;
    }),

  listEmergencyDrills: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.EMERGENCY_READ);
    return ctx.db
      .select()
      .from(emergencyDrill)
      .where(eq(emergencyDrill.organizationId, input.organizationId))
      .orderBy(desc(emergencyDrill.drillDate));
  }),

  createEmergencyDrill: protectedMutation
    .input(
      orgScope.extend({
        scenarioId: z.string().uuid(),
        drillDate: z.coerce.date(),
        outcomeSummary: z.string().max(20_000).optional(),
        attendeesNote: z.string().max(20_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.EMERGENCY_WRITE);
      const [sc] = await ctx.db
        .select({ id: emergencyScenario.id })
        .from(emergencyScenario)
        .where(
          and(
            eq(emergencyScenario.id, input.scenarioId),
            eq(emergencyScenario.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!sc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Emergency scenario not found." });
      }
      const [row] = await ctx.db
        .insert(emergencyDrill)
        .values({
          organizationId: input.organizationId,
          scenarioId: input.scenarioId,
          drillDate: input.drillDate,
          outcomeSummary: input.outcomeSummary ?? null,
          attendeesNote: input.attendeesNote ?? null,
        })
        .returning();
      return row;
    }),

  listMOC: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.MOC_READ);
    return ctx.db
      .select()
      .from(managementOfChange)
      .where(eq(managementOfChange.organizationId, input.organizationId))
      .orderBy(desc(managementOfChange.createdAt));
  }),

  createMOC: protectedMutation
    .input(
      orgScope.extend({
        title: z.string().min(2).max(512),
        description: z.string().min(1).max(50_000),
        ohSafetyImpact: z.boolean().optional(),
        environmentalImpactFlag: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.MOC_WRITE);
      const [row] = await ctx.db
        .insert(managementOfChange)
        .values({
          organizationId: input.organizationId,
          title: input.title,
          description: input.description,
          ohSafetyImpact: input.ohSafetyImpact ?? false,
          environmentalImpactFlag: input.environmentalImpactFlag ?? false,
        })
        .returning();
      return row;
    }),

  listCbAudits: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.CB_AUDIT_READ);
    return ctx.db
      .select()
      .from(certificationBodyAudit)
      .where(eq(certificationBodyAudit.organizationId, input.organizationId))
      .orderBy(desc(certificationBodyAudit.createdAt));
  }),

  createCbAudit: protectedMutation
    .input(
      orgScope.extend({
        certificationBodyName: z.string().min(1).max(256),
        standardScope: z.string().min(1).max(50_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.CB_AUDIT_WRITE);
      const [row] = await ctx.db
        .insert(certificationBodyAudit)
        .values({
          organizationId: input.organizationId,
          certificationBodyName: input.certificationBodyName,
          standardScope: input.standardScope,
        })
        .returning();
      return row;
    }),

  listCertificates: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.CERTIFICATE_READ);
    return ctx.db
      .select()
      .from(managementCertificate)
      .where(eq(managementCertificate.organizationId, input.organizationId));
  }),

  createCertificate: protectedMutation
    .input(
      orgScope.extend({
        standardName: z.string().min(1).max(128),
        certificationBodyName: z.string().min(1).max(256),
        scopeStatement: z.string().min(1).max(50_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.CERTIFICATE_WRITE);
      const [row] = await ctx.db
        .insert(managementCertificate)
        .values({
          organizationId: input.organizationId,
          standardName: input.standardName,
          certificationBodyName: input.certificationBodyName,
          scopeStatement: input.scopeStatement,
        })
        .returning();
      return row;
    }),

  listKpis: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.KPI_READ);
    return ctx.db
      .select()
      .from(kpiDefinition)
      .where(eq(kpiDefinition.organizationId, input.organizationId));
  }),

  createKpi: protectedMutation
    .input(orgScope.extend({ name: z.string().min(1).max(512), description: z.string().max(20_000).optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.KPI_WRITE);
      const [row] = await ctx.db
        .insert(kpiDefinition)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          description: input.description ?? null,
        })
        .returning();
      return row;
    }),

  listMeasurements: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.MEASUREMENT_READ);
    return ctx.db
      .select()
      .from(measurementRecord)
      .where(eq(measurementRecord.organizationId, input.organizationId))
      .orderBy(desc(measurementRecord.measuredAt));
  }),

  createMeasurement: protectedMutation
    .input(
      orgScope.extend({
        measuredAt: z.coerce.date(),
        valueNumeric: z.string().max(64).optional(),
        unit: z.string().max(64).optional(),
        notes: z.string().max(20_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.MEASUREMENT_WRITE);
      const [row] = await ctx.db
        .insert(measurementRecord)
        .values({
          organizationId: input.organizationId,
          measuredAt: input.measuredAt,
          valueNumeric: input.valueNumeric ?? null,
          unit: input.unit ?? null,
          notes: input.notes ?? null,
        })
        .returning();
      return row;
    }),
});
