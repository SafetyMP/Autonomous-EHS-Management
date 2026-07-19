import { and, desc, eq, inArray } from "drizzle-orm";
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
  mocChangeTriggerEnum,
  mocEntityLink,
  mocStatusEnum,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { assertSiteInOrg } from "../assertOrgScoped";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

const partyTypes = externalPartyTypeEnum.enumValues as [string, ...string[]];
const mocStatuses = mocStatusEnum.enumValues as [string, ...string[]];
const mocTriggers = mocChangeTriggerEnum.enumValues as [string, ...string[]];

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
      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }
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
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(emergencyScenario)
          .values({
            organizationId: input.organizationId,
            name: input.name,
            description: input.description ?? null,
          })
          .returning();
        if (row) {
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "emergency.scenario.create",
            entityType: "emergency_scenario",
            entityId: row.id,
            payload: { name: input.name },
          });
        }
        return row;
      });
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
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(emergencyDrill)
          .values({
            organizationId: input.organizationId,
            scenarioId: input.scenarioId,
            drillDate: input.drillDate,
            outcomeSummary: input.outcomeSummary ?? null,
            attendeesNote: input.attendeesNote ?? null,
          })
          .returning();
        if (row) {
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "emergency.drill.create",
            entityType: "emergency_drill",
            entityId: row.id,
            payload: { scenarioId: input.scenarioId },
          });
        }
        return row;
      });
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
        changeTrigger: z.enum(mocTriggers).optional().nullable(),
        aspectsReviewed: z.boolean().optional(),
        obligationsReviewed: z.boolean().optional(),
        controlsUpdated: z.boolean().optional(),
        postImplementationReviewDue: z.coerce.date().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.MOC_WRITE);
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(managementOfChange)
          .values({
            organizationId: input.organizationId,
            title: input.title,
            description: input.description,
            ohSafetyImpact: input.ohSafetyImpact ?? false,
            environmentalImpactFlag: input.environmentalImpactFlag ?? false,
            changeTrigger: (input.changeTrigger ??
              null) as (typeof mocChangeTriggerEnum.enumValues)[number] | null,
            aspectsReviewed: input.aspectsReviewed ?? false,
            obligationsReviewed: input.obligationsReviewed ?? false,
            controlsUpdated: input.controlsUpdated ?? false,
            postImplementationReviewDue: input.postImplementationReviewDue ?? null,
          })
          .returning();
        if (row) {
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "moc.create",
            entityType: "management_of_change",
            entityId: row.id,
            payload: { title: input.title },
          });
        }
        return row;
      });
    }),

  updateMOC: protectedMutation
    .input(
      orgScope.extend({
        mocId: z.string().uuid(),
        title: z.string().min(2).max(512).optional(),
        description: z.string().min(1).max(50_000).optional(),
        ohSafetyImpact: z.boolean().optional(),
        environmentalImpactFlag: z.boolean().optional(),
        changeTrigger: z.enum(mocTriggers).optional().nullable(),
        aspectsReviewed: z.boolean().optional(),
        obligationsReviewed: z.boolean().optional(),
        controlsUpdated: z.boolean().optional(),
        postImplementationReviewDue: z.coerce.date().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.MOC_WRITE);

      const [existing] = await ctx.db
        .select()
        .from(managementOfChange)
        .where(
          and(
            eq(managementOfChange.id, input.mocId),
            eq(managementOfChange.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "MOC not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(managementOfChange)
          .set({
            title: input.title ?? existing.title,
            description: input.description ?? existing.description,
            ohSafetyImpact:
              input.ohSafetyImpact !== undefined ? input.ohSafetyImpact : existing.ohSafetyImpact,
            environmentalImpactFlag:
              input.environmentalImpactFlag !== undefined
                ? input.environmentalImpactFlag
                : existing.environmentalImpactFlag,
            changeTrigger:
              input.changeTrigger !== undefined
                ? (input.changeTrigger as (typeof mocChangeTriggerEnum.enumValues)[number] | null)
                : existing.changeTrigger,
            aspectsReviewed:
              input.aspectsReviewed !== undefined
                ? input.aspectsReviewed
                : existing.aspectsReviewed,
            obligationsReviewed:
              input.obligationsReviewed !== undefined
                ? input.obligationsReviewed
                : existing.obligationsReviewed,
            controlsUpdated:
              input.controlsUpdated !== undefined
                ? input.controlsUpdated
                : existing.controlsUpdated,
            postImplementationReviewDue:
              input.postImplementationReviewDue !== undefined
                ? input.postImplementationReviewDue
                : existing.postImplementationReviewDue,
            updatedAt: new Date(),
          })
          .where(eq(managementOfChange.id, input.mocId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "moc.update",
          entityType: "management_of_change",
          entityId: input.mocId,
          payload: {},
        });
        return row;
      });
    }),

  updateMOCStatus: protectedMutation
    .input(
      orgScope.extend({
        mocId: z.string().uuid(),
        status: z.enum(mocStatuses),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.MOC_WRITE);

      const [existing] = await ctx.db
        .select()
        .from(managementOfChange)
        .where(
          and(
            eq(managementOfChange.id, input.mocId),
            eq(managementOfChange.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "MOC not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(managementOfChange)
          .set({
            status: input.status as (typeof mocStatusEnum.enumValues)[number],
            updatedAt: new Date(),
          })
          .where(eq(managementOfChange.id, input.mocId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "moc.update_status",
          entityType: "management_of_change",
          entityId: input.mocId,
          payload: { from: existing.status, to: input.status },
        });
        return row;
      });
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
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(certificationBodyAudit)
          .values({
            organizationId: input.organizationId,
            certificationBodyName: input.certificationBodyName,
            standardScope: input.standardScope,
          })
          .returning();
        if (row) {
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "cb_audit.create",
            entityType: "certification_body_audit",
            entityId: row.id,
            payload: { certificationBodyName: input.certificationBodyName },
          });
        }
        return row;
      });
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
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(managementCertificate)
          .values({
            organizationId: input.organizationId,
            standardName: input.standardName,
            certificationBodyName: input.certificationBodyName,
            scopeStatement: input.scopeStatement,
          })
          .returning();
        if (row) {
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "management_certificate.create",
            entityType: "management_certificate",
            entityId: row.id,
            payload: {
              standardName: input.standardName,
              certificationBodyName: input.certificationBodyName,
            },
          });
        }
        return row;
      });
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
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(kpiDefinition)
          .values({
            organizationId: input.organizationId,
            name: input.name,
            description: input.description ?? null,
          })
          .returning();
        if (row) {
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "kpi_definition.create",
            entityType: "kpi_definition",
            entityId: row.id,
            payload: { name: input.name },
          });
        }
        return row;
      });
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
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(measurementRecord)
          .values({
            organizationId: input.organizationId,
            measuredAt: input.measuredAt,
            valueNumeric: input.valueNumeric ?? null,
            unit: input.unit ?? null,
            notes: input.notes ?? null,
          })
          .returning();
        if (row) {
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "measurement_record.create",
            entityType: "measurement_record",
            entityId: row.id,
            payload: {
              measuredAt: input.measuredAt.toISOString(),
              valueNumeric: input.valueNumeric ?? null,
              unit: input.unit ?? null,
            },
          });
        }
        return row;
      });
    }),

  listMocEntityLinks: protectedProcedure
    .input(orgScope.extend({ mocId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.MOC_READ);

      const mocConditions = [eq(managementOfChange.organizationId, input.organizationId)];
      if (input.mocId) {
        mocConditions.push(eq(managementOfChange.id, input.mocId));
      }

      const mocs = await ctx.db
        .select({ id: managementOfChange.id, title: managementOfChange.title })
        .from(managementOfChange)
        .where(and(...mocConditions));

      if (mocs.length === 0) return [];

      const mocIds = mocs.map((m) => m.id);
      const titleByMocId = new Map(mocs.map((m) => [m.id, m.title]));

      const links = await ctx.db
        .select()
        .from(mocEntityLink)
        .where(inArray(mocEntityLink.mocId, mocIds));

      return links.map((l) => ({
        mocId: l.mocId,
        mocTitle: titleByMocId.get(l.mocId) ?? l.mocId,
        entityType: l.entityType,
        entityId: l.entityId,
      }));
    }),
});
