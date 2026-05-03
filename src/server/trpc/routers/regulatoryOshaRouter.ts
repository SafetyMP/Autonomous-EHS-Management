import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  incident,
  injuryIllnessCategoryEnum,
  oshaRecordDeterminationStatusEnum,
  oshaRecordableClassificationEnum,
  oshaRecordkeepingFrameworkEnum,
  personSubject,
  workRelatedInjuryIllnessRecord,
} from "@/server/db/schema";
import { getRecordkeepingReferencePayload } from "@/lib/regulatory/usRecordkeepingReference";
import { buildAgencyExportPlaceholder } from "@/lib/regulatory/oshaAgencyExportScaffold";
import { writeAuditLog } from "@/server/services/audit";
import {
  assertEstablishmentInOrg,
  assertPersonSubjectInOrg,
} from "../assertOrgScoped";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

const classifications = oshaRecordableClassificationEnum.enumValues as [string, ...string[]];
const categories = injuryIllnessCategoryEnum.enumValues as [string, ...string[]];
const frameworks = oshaRecordkeepingFrameworkEnum.enumValues as [string, ...string[]];
const determinationStatuses = oshaRecordDeterminationStatusEnum.enumValues as [
  string,
  ...string[],
];

export const regulatoryOshaRouter = router({
  /** Placeholder for future agency-formatted OSHA output; not filing-ready (see scaffold). */
  agencyExportPlaceholder: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.REGULATORY_OSHA_READ,
    );
    return buildAgencyExportPlaceholder();
  }),

  /** Static reference data + disclaimer for federal vs state-plan recordkeeping (not legal advice). */
  recordkeepingReference: protectedProcedure.query(() => getRecordkeepingReferencePayload()),

  listPersonSubjects: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.REGULATORY_OSHA_READ,
    );

    return ctx.db
      .select()
      .from(personSubject)
      .where(eq(personSubject.organizationId, input.organizationId))
      .orderBy(desc(personSubject.createdAt));
  }),

  createPersonSubject: protectedMutation
    .input(
      orgScope.extend({
        displayPseudonym: z.string().min(1).max(64),
        notes: z.string().max(8192).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.REGULATORY_OSHA_WRITE,
      );

      return ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(personSubject)
          .values({
            organizationId: input.organizationId,
            displayPseudonym: input.displayPseudonym,
            notes: input.notes ?? null,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create person subject.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "person_subject.create",
          entityType: "person_subject",
          entityId: created.id,
          payload: { displayPseudonym: input.displayPseudonym },
        });

        return created;
      });
    }),

  getInjuryIllnessRecord: protectedProcedure
    .input(orgScope.extend({ incidentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.REGULATORY_OSHA_READ,
      );

      const [row] = await ctx.db
        .select()
        .from(workRelatedInjuryIllnessRecord)
        .where(
          and(
            eq(workRelatedInjuryIllnessRecord.incidentId, input.incidentId),
            eq(workRelatedInjuryIllnessRecord.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      return row ?? null;
    }),

  upsertInjuryIllnessRecord: protectedMutation
    .input(
      orgScope
        .extend({
          incidentId: z.string().uuid(),
          establishmentId: z.string().uuid().optional().nullable(),
          injuredPersonSubjectId: z.string().uuid().optional().nullable(),
          oshaRecordable: z.boolean().optional(),
          recordableClassification: z.enum(classifications).optional().nullable(),
          recordkeepingFramework: z.enum(frameworks).optional(),
          recordkeepingStateCode: z
            .string()
            .length(2)
            .regex(/^[a-zA-Z]{2}$/)
            .optional()
            .nullable()
            .transform((s) => (s == null ? null : s.toUpperCase())),
          stateRuleReference: z.string().max(512).optional().nullable(),
          jurisdictionNotes: z.string().max(65_000).optional().nullable(),
          determinationStatus: z.enum(determinationStatuses).optional(),
          classificationRationale: z.string().max(65_000).optional().nullable(),
          workRelatedRationale: z.string().max(65_000).optional().nullable(),
          phcpDeterminationSummary: z.string().max(8192).optional().nullable(),
          daysAway: z.number().int().min(0).optional().nullable(),
          daysRestricted: z.number().int().min(0).optional().nullable(),
          caseNumberEstablishment: z.string().max(64).optional().nullable(),
          privacyCase: z.boolean().optional(),
          jobTitle: z.string().max(256).optional().nullable(),
          dateHired: z.coerce.date().optional().nullable(),
          injuryIllnessCategory: z.enum(categories).optional().nullable(),
          bodyPart: z.string().max(8192).optional().nullable(),
          objectSubstance: z.string().max(8192).optional().nullable(),
          physicianFacilityNote: z.string().max(8192).optional().nullable(),
          supplementaryDetailsCiphertext: z.string().max(65535).optional().nullable(),
          retainUntil: z.coerce.date().optional().nullable(),
          legalHold: z.boolean().optional(),
        }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.REGULATORY_OSHA_WRITE,
      );

      const [inc] = await ctx.db
        .select()
        .from(incident)
        .where(
          and(eq(incident.id, input.incidentId), eq(incident.organizationId, input.organizationId)),
        )
        .limit(1);

      if (!inc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
      }

      if (input.establishmentId) {
        await assertEstablishmentInOrg(ctx.db, input.organizationId, input.establishmentId);
      }
      if (input.injuredPersonSubjectId) {
        await assertPersonSubjectInOrg(
          ctx.db,
          input.organizationId,
          input.injuredPersonSubjectId,
        );
      }

      return ctx.db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(workRelatedInjuryIllnessRecord)
          .where(eq(workRelatedInjuryIllnessRecord.incidentId, input.incidentId))
          .limit(1);

        const mergedFramework =
          input.recordkeepingFramework ??
          existing?.recordkeepingFramework ??
          "undetermined";
        const mergedStateCode =
          input.recordkeepingStateCode !== undefined
            ? input.recordkeepingStateCode
            : (existing?.recordkeepingStateCode ?? null);

        if (
          (mergedFramework === "state_plan" || mergedFramework === "state_statute_supplement") &&
          !mergedStateCode
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "US state (postal code) is required when recordkeeping framework is state plan or state statute supplement.",
          });
        }

        const prevStatus = existing?.determinationStatus ?? "draft";
        const nextStatus =
          input.determinationStatus !== undefined
            ? (input.determinationStatus as (typeof oshaRecordDeterminationStatusEnum.enumValues)[number])
            : prevStatus;

        let determinedAt = existing?.determinedAt ?? null;
        let determinedByUserId = existing?.determinedByUserId ?? null;
        if (input.determinationStatus !== undefined) {
          if (nextStatus === "determined" && prevStatus !== "determined") {
            determinedAt = new Date();
            determinedByUserId = ctx.user.id;
          } else if (nextStatus !== "determined") {
            determinedAt = null;
            determinedByUserId = null;
          }
        }

        const patch = {
          establishmentId:
            input.establishmentId !== undefined
              ? input.establishmentId
              : (existing?.establishmentId ?? null),
          injuredPersonSubjectId:
            input.injuredPersonSubjectId !== undefined
              ? input.injuredPersonSubjectId
              : (existing?.injuredPersonSubjectId ?? null),
          oshaRecordable: input.oshaRecordable ?? existing?.oshaRecordable ?? false,
          recordableClassification:
            input.recordableClassification !== undefined
              ? (input.recordableClassification as (typeof oshaRecordableClassificationEnum.enumValues)[number] | null)
              : (existing?.recordableClassification ?? null),
          recordkeepingFramework:
            input.recordkeepingFramework !== undefined
              ? (input.recordkeepingFramework as (typeof oshaRecordkeepingFrameworkEnum.enumValues)[number])
              : (existing?.recordkeepingFramework ?? "undetermined"),
          recordkeepingStateCode:
            input.recordkeepingStateCode !== undefined
              ? input.recordkeepingStateCode
              : (existing?.recordkeepingStateCode ?? null),
          stateRuleReference:
            input.stateRuleReference !== undefined
              ? input.stateRuleReference
              : (existing?.stateRuleReference ?? null),
          jurisdictionNotes:
            input.jurisdictionNotes !== undefined
              ? input.jurisdictionNotes
              : (existing?.jurisdictionNotes ?? null),
          determinationStatus: nextStatus,
          classificationRationale:
            input.classificationRationale !== undefined
              ? input.classificationRationale
              : (existing?.classificationRationale ?? null),
          workRelatedRationale:
            input.workRelatedRationale !== undefined
              ? input.workRelatedRationale
              : (existing?.workRelatedRationale ?? null),
          phcpDeterminationSummary:
            input.phcpDeterminationSummary !== undefined
              ? input.phcpDeterminationSummary
              : (existing?.phcpDeterminationSummary ?? null),
          determinedAt,
          determinedByUserId,
          daysAway: input.daysAway !== undefined ? input.daysAway : (existing?.daysAway ?? null),
          daysRestricted:
            input.daysRestricted !== undefined
              ? input.daysRestricted
              : (existing?.daysRestricted ?? null),
          caseNumberEstablishment:
            input.caseNumberEstablishment !== undefined
              ? input.caseNumberEstablishment
              : (existing?.caseNumberEstablishment ?? null),
          privacyCase: input.privacyCase ?? existing?.privacyCase ?? false,
          jobTitle: input.jobTitle !== undefined ? input.jobTitle : (existing?.jobTitle ?? null),
          dateHired: input.dateHired !== undefined ? input.dateHired : (existing?.dateHired ?? null),
          injuryIllnessCategory:
            input.injuryIllnessCategory !== undefined
              ? (input.injuryIllnessCategory as (typeof injuryIllnessCategoryEnum.enumValues)[number] | null)
              : (existing?.injuryIllnessCategory ?? null),
          bodyPart: input.bodyPart !== undefined ? input.bodyPart : (existing?.bodyPart ?? null),
          objectSubstance:
            input.objectSubstance !== undefined ? input.objectSubstance : (existing?.objectSubstance ?? null),
          physicianFacilityNote:
            input.physicianFacilityNote !== undefined
              ? input.physicianFacilityNote
              : (existing?.physicianFacilityNote ?? null),
          supplementaryDetailsCiphertext:
            input.supplementaryDetailsCiphertext !== undefined
              ? input.supplementaryDetailsCiphertext
              : (existing?.supplementaryDetailsCiphertext ?? null),
          retainUntil:
            input.retainUntil !== undefined ? input.retainUntil : (existing?.retainUntil ?? null),
          legalHold: input.legalHold ?? existing?.legalHold ?? false,
          updatedAt: new Date(),
        };

        if (existing) {
          const [updated] = await tx
            .update(workRelatedInjuryIllnessRecord)
            .set(patch)
            .where(eq(workRelatedInjuryIllnessRecord.id, existing.id))
            .returning();

          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "work_related_injury_illness_record.update",
            entityType: "work_related_injury_illness_record",
            entityId: existing.id,
            payload: { incidentId: input.incidentId },
          });

          return updated;
        }

        const [inserted] = await tx
          .insert(workRelatedInjuryIllnessRecord)
          .values({
            organizationId: input.organizationId,
            incidentId: input.incidentId,
            establishmentId: patch.establishmentId,
            injuredPersonSubjectId: patch.injuredPersonSubjectId,
            oshaRecordable: patch.oshaRecordable,
            recordableClassification: patch.recordableClassification,
            recordkeepingFramework: patch.recordkeepingFramework,
            recordkeepingStateCode: patch.recordkeepingStateCode,
            stateRuleReference: patch.stateRuleReference,
            jurisdictionNotes: patch.jurisdictionNotes,
            determinationStatus: patch.determinationStatus,
            classificationRationale: patch.classificationRationale,
            workRelatedRationale: patch.workRelatedRationale,
            phcpDeterminationSummary: patch.phcpDeterminationSummary,
            determinedAt: patch.determinedAt,
            determinedByUserId: patch.determinedByUserId,
            daysAway: patch.daysAway,
            daysRestricted: patch.daysRestricted,
            caseNumberEstablishment: patch.caseNumberEstablishment,
            privacyCase: patch.privacyCase,
            jobTitle: patch.jobTitle,
            dateHired: patch.dateHired,
            injuryIllnessCategory: patch.injuryIllnessCategory,
            bodyPart: patch.bodyPart,
            objectSubstance: patch.objectSubstance,
            physicianFacilityNote: patch.physicianFacilityNote,
            supplementaryDetailsCiphertext: patch.supplementaryDetailsCiphertext,
            retainUntil: patch.retainUntil,
            legalHold: patch.legalHold,
          })
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "work_related_injury_illness_record.create",
          entityType: "work_related_injury_illness_record",
          entityId: inserted!.id,
          payload: { incidentId: input.incidentId },
        });

        return inserted;
      });
    }),

  /**
   * Audited JSON snapshot for OSHA-oriented injury/illness records (no KMS ciphertext or raw PHI fields).
   * Counsel should review what may be exported in your jurisdiction before relying on this as a regulatory filing.
   */
  exportInjuryIllnessSnapshot: protectedProcedure.input(orgScope).mutation(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.REGULATORY_OSHA_READ,
    );

    const rows = await ctx.db
      .select({
        recordId: workRelatedInjuryIllnessRecord.id,
        incidentId: workRelatedInjuryIllnessRecord.incidentId,
        incidentTitle: incident.title,
        oshaRecordable: workRelatedInjuryIllnessRecord.oshaRecordable,
        recordableClassification: workRelatedInjuryIllnessRecord.recordableClassification,
        recordkeepingFramework: workRelatedInjuryIllnessRecord.recordkeepingFramework,
        recordkeepingStateCode: workRelatedInjuryIllnessRecord.recordkeepingStateCode,
        determinationStatus: workRelatedInjuryIllnessRecord.determinationStatus,
        daysAway: workRelatedInjuryIllnessRecord.daysAway,
        daysRestricted: workRelatedInjuryIllnessRecord.daysRestricted,
        privacyCase: workRelatedInjuryIllnessRecord.privacyCase,
        legalHold: workRelatedInjuryIllnessRecord.legalHold,
        injuryIllnessCategory: workRelatedInjuryIllnessRecord.injuryIllnessCategory,
        updatedAt: workRelatedInjuryIllnessRecord.updatedAt,
      })
      .from(workRelatedInjuryIllnessRecord)
      .innerJoin(incident, eq(workRelatedInjuryIllnessRecord.incidentId, incident.id))
      .where(eq(workRelatedInjuryIllnessRecord.organizationId, input.organizationId))
      .orderBy(desc(workRelatedInjuryIllnessRecord.updatedAt));

    await writeAuditLog(ctx.db, {
      organizationId: input.organizationId,
      actorUserId: ctx.user.id,
      action: "regulatory_osha.export_injury_illness_snapshot",
      entityType: "organization",
      entityId: input.organizationId,
      payload: { recordCount: rows.length },
    });

    return {
      exportedAt: new Date().toISOString(),
      organizationId: input.organizationId,
      recordCount: rows.length,
      records: rows,
    };
  }),
});
