import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  EPCRA_HAZARD_CATALOG_VERSION,
  EPCRA_HAZARD_CLASS_OPTIONS,
  domainForHazardClass,
  isValidEpcraHazardPair,
} from "@/lib/regulatory/epcraHazardCategories2027";
import {
  chemicalHazardClassification,
  facilityChemicalInventory,
  regulatoryChemical,
  safetyDataSheetRef,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { assertEstablishmentInOrg } from "../assertOrgScoped";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

export const chemicalInventoryRouter = router({
  listChemicals: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.CHEMICAL_INVENTORY_READ,
    );

    return ctx.db
      .select()
      .from(regulatoryChemical)
      .where(eq(regulatoryChemical.organizationId, input.organizationId))
      .orderBy(desc(regulatoryChemical.updatedAt));
  }),

  createChemical: protectedMutation
    .input(
      orgScope.extend({
        name: z.string().min(1).max(512),
        casNumber: z.string().max(32).optional().nullable(),
        alternateId: z.string().max(128).optional().nullable(),
        description: z.string().max(8192).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CHEMICAL_INVENTORY_WRITE,
      );

      return ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(regulatoryChemical)
          .values({
            organizationId: input.organizationId,
            name: input.name,
            casNumber: input.casNumber ?? null,
            alternateId: input.alternateId ?? null,
            description: input.description ?? null,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create regulatory chemical.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "regulatory_chemical.create",
          entityType: "regulatory_chemical",
          entityId: created.id,
          payload: { name: input.name },
        });

        return created;
      });
    }),

  createSds: protectedMutation
    .input(
      orgScope.extend({
        regulatoryChemicalId: z.string().uuid().optional().nullable(),
        title: z.string().min(1).max(512),
        revision: z.string().max(64).optional().nullable(),
        storageUrl: z.string().max(2048).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CHEMICAL_INVENTORY_WRITE,
      );

      if (input.regulatoryChemicalId) {
        const [c] = await ctx.db
          .select()
          .from(regulatoryChemical)
          .where(
            and(
              eq(regulatoryChemical.id, input.regulatoryChemicalId),
              eq(regulatoryChemical.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!c) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Chemical not found in organization.",
          });
        }
      }

      return ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(safetyDataSheetRef)
          .values({
            organizationId: input.organizationId,
            regulatoryChemicalId: input.regulatoryChemicalId ?? null,
            title: input.title,
            revision: input.revision ?? null,
            storageUrl: input.storageUrl ?? null,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create SDS reference.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "safety_data_sheet_ref.create",
          entityType: "safety_data_sheet_ref",
          entityId: created.id,
          payload: { title: input.title },
        });

        return created;
      });
    }),

  listInventory: protectedProcedure
    .input(
      orgScope.extend({
        establishmentId: z.string().uuid(),
        reportingYear: z.number().int().min(1970).max(2100).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CHEMICAL_INVENTORY_READ,
      );
      await assertEstablishmentInOrg(ctx.db, input.organizationId, input.establishmentId);

      const conditions = [
        eq(facilityChemicalInventory.establishmentId, input.establishmentId),
        eq(facilityChemicalInventory.organizationId, input.organizationId),
      ];
      if (input.reportingYear !== undefined) {
        conditions.push(eq(facilityChemicalInventory.reportingYear, input.reportingYear));
      }

      return ctx.db
        .select()
        .from(facilityChemicalInventory)
        .where(and(...conditions))
        .orderBy(desc(facilityChemicalInventory.updatedAt));
    }),

  upsertInventory: protectedMutation
    .input(
      orgScope.extend({
        establishmentId: z.string().uuid(),
        regulatoryChemicalId: z.string().uuid(),
        reportingYear: z.number().int().min(1970).max(2100),
        maxAmount: z.number().finite().positive(),
        amountUnit: z.string().min(1).max(32),
        storageTypes: z.array(z.string().max(128)).max(32).optional(),
        safetyDataSheetId: z.string().uuid().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CHEMICAL_INVENTORY_WRITE,
      );
      await assertEstablishmentInOrg(ctx.db, input.organizationId, input.establishmentId);

      const [chem] = await ctx.db
        .select()
        .from(regulatoryChemical)
        .where(
          and(
            eq(regulatoryChemical.id, input.regulatoryChemicalId),
            eq(regulatoryChemical.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!chem) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Chemical not found in organization.",
        });
      }

      if (input.safetyDataSheetId) {
        const [sds] = await ctx.db
          .select()
          .from(safetyDataSheetRef)
          .where(
            and(
              eq(safetyDataSheetRef.id, input.safetyDataSheetId),
              eq(safetyDataSheetRef.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!sds) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "SDS not found in organization.",
          });
        }
      }

      return ctx.db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(facilityChemicalInventory)
          .where(
            and(
              eq(facilityChemicalInventory.establishmentId, input.establishmentId),
              eq(facilityChemicalInventory.regulatoryChemicalId, input.regulatoryChemicalId),
              eq(facilityChemicalInventory.reportingYear, input.reportingYear),
            ),
          )
          .limit(1);

        const nextTypes = input.storageTypes ?? existing?.storageTypes ?? [];

        if (existing) {
          const [updated] = await tx
            .update(facilityChemicalInventory)
            .set({
              maxAmount: input.maxAmount,
              amountUnit: input.amountUnit,
              storageTypes: nextTypes,
              safetyDataSheetId: input.safetyDataSheetId ?? null,
              updatedAt: new Date(),
            })
            .where(eq(facilityChemicalInventory.id, existing.id))
            .returning();

          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "facility_chemical_inventory.update",
            entityType: "facility_chemical_inventory",
            entityId: existing.id,
            payload: { reportingYear: input.reportingYear },
          });

          return updated;
        }

        const [inserted] = await tx
          .insert(facilityChemicalInventory)
          .values({
            organizationId: input.organizationId,
            establishmentId: input.establishmentId,
            regulatoryChemicalId: input.regulatoryChemicalId,
            reportingYear: input.reportingYear,
            maxAmount: input.maxAmount,
            amountUnit: input.amountUnit,
            storageTypes: nextTypes,
            safetyDataSheetId: input.safetyDataSheetId ?? null,
          })
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "facility_chemical_inventory.create",
          entityType: "facility_chemical_inventory",
          entityId: inserted!.id,
          payload: { reportingYear: input.reportingYear },
        });

        return inserted;
      });
    }),

  listSds: protectedProcedure
    .input(
      orgScope.extend({
        regulatoryChemicalId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CHEMICAL_INVENTORY_READ,
      );

      const conditions = [eq(safetyDataSheetRef.organizationId, input.organizationId)];
      if (input.regulatoryChemicalId) {
        conditions.push(eq(safetyDataSheetRef.regulatoryChemicalId, input.regulatoryChemicalId));
      }

      return ctx.db
        .select()
        .from(safetyDataSheetRef)
        .where(and(...conditions))
        .orderBy(desc(safetyDataSheetRef.updatedAt));
    }),

  hazardCatalog: protectedProcedure.query(() => ({
    version: EPCRA_HAZARD_CATALOG_VERSION,
    hazardClasses: EPCRA_HAZARD_CLASS_OPTIONS,
    disclaimer:
      "HCS 2024 / EPCRA 2027 programme hazard classes. Not Tier2 Submit or EPA e-filing.",
  })),

  listClassifications: protectedProcedure
    .input(
      orgScope.extend({
        regulatoryChemicalId: z.string().uuid().optional(),
        safetyDataSheetId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CHEMICAL_INVENTORY_READ,
      );

      const conditions = [eq(chemicalHazardClassification.organizationId, input.organizationId)];
      if (input.regulatoryChemicalId) {
        conditions.push(
          eq(chemicalHazardClassification.regulatoryChemicalId, input.regulatoryChemicalId),
        );
      }
      if (input.safetyDataSheetId) {
        conditions.push(
          eq(chemicalHazardClassification.safetyDataSheetId, input.safetyDataSheetId),
        );
      }

      return ctx.db
        .select()
        .from(chemicalHazardClassification)
        .where(and(...conditions))
        .orderBy(desc(chemicalHazardClassification.updatedAt));
    }),

  setClassification: protectedMutation
    .input(
      orgScope.extend({
        regulatoryChemicalId: z.string().uuid().optional().nullable(),
        safetyDataSheetId: z.string().uuid().optional().nullable(),
        hazardClass: z.string().min(1).max(256),
        hazardCategory: z.string().min(1).max(128),
        source: z.enum(["sds_section_2", "manual"]).optional(),
        effectiveFrom: z.coerce.date().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CHEMICAL_INVENTORY_WRITE,
      );

      if (!isValidEpcraHazardPair(input.hazardClass, input.hazardCategory)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Hazard class/category pair is not in the programme catalog.",
        });
      }

      const domain = domainForHazardClass(input.hazardClass);
      if (!domain) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown hazard class." });
      }

      if (input.regulatoryChemicalId) {
        const [c] = await ctx.db
          .select()
          .from(regulatoryChemical)
          .where(
            and(
              eq(regulatoryChemical.id, input.regulatoryChemicalId),
              eq(regulatoryChemical.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!c) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Chemical not found in organization.",
          });
        }
      }

      if (input.safetyDataSheetId) {
        const [sds] = await ctx.db
          .select()
          .from(safetyDataSheetRef)
          .where(
            and(
              eq(safetyDataSheetRef.id, input.safetyDataSheetId),
              eq(safetyDataSheetRef.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!sds) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "SDS not found in organization.",
          });
        }
      }

      return ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(chemicalHazardClassification)
          .values({
            organizationId: input.organizationId,
            regulatoryChemicalId: input.regulatoryChemicalId ?? null,
            safetyDataSheetId: input.safetyDataSheetId ?? null,
            hazardDomain: domain,
            hazardClass: input.hazardClass,
            hazardCategory: input.hazardCategory,
            source: input.source ?? "manual",
            effectiveFrom: input.effectiveFrom ?? null,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create hazard classification.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "chemical_hazard_classification.create",
          entityType: "chemical_hazard_classification",
          entityId: created.id,
          payload: {
            hazardClass: input.hazardClass,
            hazardCategory: input.hazardCategory,
          },
        });

        return created;
      });
    }),

  deleteClassification: protectedMutation
    .input(orgScope.extend({ classificationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CHEMICAL_INVENTORY_WRITE,
      );

      return ctx.db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(chemicalHazardClassification)
          .where(
            and(
              eq(chemicalHazardClassification.id, input.classificationId),
              eq(chemicalHazardClassification.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Classification not found." });
        }

        await tx
          .delete(chemicalHazardClassification)
          .where(eq(chemicalHazardClassification.id, input.classificationId));

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "chemical_hazard_classification.delete",
          entityType: "chemical_hazard_classification",
          entityId: input.classificationId,
          payload: {},
        });

        return { ok: true as const };
      });
    }),

  exportInventoryJson: protectedProcedure
    .input(
      orgScope.extend({
        establishmentId: z.string().uuid(),
        reportingYear: z.number().int().min(1970).max(2100).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CHEMICAL_INVENTORY_READ,
      );
      await assertEstablishmentInOrg(ctx.db, input.organizationId, input.establishmentId);

      const conditions = [
        eq(facilityChemicalInventory.establishmentId, input.establishmentId),
        eq(facilityChemicalInventory.organizationId, input.organizationId),
      ];
      if (input.reportingYear !== undefined) {
        conditions.push(eq(facilityChemicalInventory.reportingYear, input.reportingYear));
      }

      const inventory = await ctx.db
        .select()
        .from(facilityChemicalInventory)
        .where(and(...conditions));
      const chemicals = await ctx.db
        .select()
        .from(regulatoryChemical)
        .where(eq(regulatoryChemical.organizationId, input.organizationId));
      const classifications = await ctx.db
        .select()
        .from(chemicalHazardClassification)
        .where(eq(chemicalHazardClassification.organizationId, input.organizationId));

      return {
        disclaimer:
          "Programme inventory export — not Tier2 Submit or EPA agency filing.",
        catalogVersion: EPCRA_HAZARD_CATALOG_VERSION,
        establishmentId: input.establishmentId,
        reportingYear: input.reportingYear ?? null,
        chemicals,
        inventory,
        classifications,
      };
    }),
});
