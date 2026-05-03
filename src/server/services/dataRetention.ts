import { and, eq, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import type { Db } from "@/server/db";
import {
  dataLifecycleRun,
  dataRetentionPolicy,
  environmentalRegulatoryPermit,
  incident,
  riskAssessment,
  riskAssessmentStep,
  safetyObservation,
  workPermit,
  workRelatedInjuryIllnessRecord,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";

type Tx = Pick<Db, "insert" | "update" | "delete">;

async function orgsWithDeletePolicy(
  db: Db,
  orgIds: string[],
  recordClass:
    | "incident_general"
    | "safety_observation_program"
    | "work_permit_program"
    | "environmental_regulatory_permit_program"
    | "risk_assessment_program",
): Promise<Set<string>> {
  if (orgIds.length === 0) return new Set();
  const rows = await db
    .select({ organizationId: dataRetentionPolicy.organizationId })
    .from(dataRetentionPolicy)
    .where(
      and(
        inArray(dataRetentionPolicy.organizationId, orgIds),
        eq(dataRetentionPolicy.recordClass, recordClass),
        eq(dataRetentionPolicy.action, "delete"),
      ),
    );
  return new Set(rows.map((r) => r.organizationId));
}

export async function anonymizeIncidentInTx(
  tx: Tx,
  params: { organizationId: string; incidentId: string },
) {
  const pseudo = `anon-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  await tx
    .update(incident)
    .set({
      title: "Anonymized record",
      description: "[anonymized]",
      immediateActions: null,
      investigationNotes: null,
      rootCauseSummary: null,
      rcaFiveWhys: null,
      rcaFishbone: null,
      contributingFactors: null,
      investigationBowTie: null,
      investigationChronology: null,
      investigationCausalFactors: null,
      reportedByUserId: null,
      investigationOwnerUserId: null,
      externalPartyId: null,
      anonymizedAt: new Date(),
      pseudonymId: pseudo,
      updatedAt: new Date(),
    })
    .where(
      and(eq(incident.id, params.incidentId), eq(incident.organizationId, params.organizationId)),
    );

  await tx
    .update(workRelatedInjuryIllnessRecord)
    .set({
      physicianFacilityNote: null,
      bodyPart: null,
      objectSubstance: null,
      supplementaryDetailsCiphertext: null,
      jobTitle: null,
      dateHired: null,
      injuredPersonSubjectId: null,
      classificationRationale: null,
      workRelatedRationale: null,
      phcpDeterminationSummary: null,
      jurisdictionNotes: null,
      stateRuleReference: null,
      recordkeepingStateCode: null,
      determinedAt: null,
      determinedByUserId: null,
      updatedAt: new Date(),
    })
    .where(eq(workRelatedInjuryIllnessRecord.incidentId, params.incidentId));

  await writeAuditLog(tx, {
    organizationId: params.organizationId,
    actorUserId: null,
    action: "data_lifecycle.anonymize_incident",
    entityType: "incident",
    entityId: params.incidentId,
    payload: { pseudonymId: pseudo },
  });
}

export async function anonymizeSafetyObservationInTx(
  tx: Tx,
  params: { organizationId: string; observationId: string },
) {
  await tx
    .update(safetyObservation)
    .set({
      summary: "Anonymized observation",
      details: null,
      assigneeUserId: null,
      followUpDueAt: null,
      anonymizedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(safetyObservation.id, params.observationId),
        eq(safetyObservation.organizationId, params.organizationId),
      ),
    );

  await writeAuditLog(tx, {
    organizationId: params.organizationId,
    actorUserId: null,
    action: "data_lifecycle.anonymize_safety_observation",
    entityType: "safety_observation",
    entityId: params.observationId,
    payload: {},
  });
}

export async function anonymizeWorkPermitInTx(
  tx: Tx,
  params: { organizationId: string; permitId: string },
) {
  await tx
    .update(workPermit)
    .set({
      title: "Anonymized permit",
      workSummary: "[anonymized]",
      hazardsControls: null,
      cancelReason: null,
      approvedByUserId: null,
      anonymizedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(eq(workPermit.id, params.permitId), eq(workPermit.organizationId, params.organizationId)),
    );

  await writeAuditLog(tx, {
    organizationId: params.organizationId,
    actorUserId: null,
    action: "data_lifecycle.anonymize_work_permit",
    entityType: "work_permit",
    entityId: params.permitId,
    payload: {},
  });
}

export async function anonymizeEnvironmentalRegulatoryPermitInTx(
  tx: Tx,
  params: { organizationId: string; permitId: string },
) {
  await tx
    .update(environmentalRegulatoryPermit)
    .set({
      title: "Anonymized permit",
      permitIdentifier: "anon",
      agency: null,
      jurisdiction: null,
      legalCitations: null,
      limits: null,
      ownerUserId: null,
      anonymizedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(environmentalRegulatoryPermit.id, params.permitId),
        eq(environmentalRegulatoryPermit.organizationId, params.organizationId),
      ),
    );

  await writeAuditLog(tx, {
    organizationId: params.organizationId,
    actorUserId: null,
    action: "data_lifecycle.anonymize_environmental_regulatory_permit",
    entityType: "environmental_regulatory_permit",
    entityId: params.permitId,
    payload: {},
  });
}

export async function anonymizeRiskAssessmentInTx(
  tx: Tx,
  params: { organizationId: string; riskAssessmentId: string },
) {
  await tx.delete(riskAssessmentStep).where(eq(riskAssessmentStep.riskAssessmentId, params.riskAssessmentId));

  await tx
    .update(riskAssessment)
    .set({
      summaryTitle: null,
      context: "[anonymized]",
      existingControls: null,
      hazardId: null,
      siteId: null,
      assessedByUserId: null,
      anonymizedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(riskAssessment.id, params.riskAssessmentId),
        eq(riskAssessment.organizationId, params.organizationId),
      ),
    );

  await writeAuditLog(tx, {
    organizationId: params.organizationId,
    actorUserId: null,
    action: "data_lifecycle.anonymize_risk_assessment",
    entityType: "risk_assessment",
    entityId: params.riskAssessmentId,
    payload: {},
  });
}

/**
 * Processes regulated rows past optional `retain_until` without `legal_hold`.
 * Incidents delete only when org has `data_retention_policy` with `record_class = incident_general` and `action = delete`.
 * Safety observations use `record_class = safety_observation_program`; work permits use `work_permit_program`.
 */
export async function runDataRetentionCron(
  db: Db,
  options?: { batchSize?: number },
): Promise<{
  anonymized: number;
  deleted: number;
  observationsAnonymized: number;
  observationsDeleted: number;
  permitsAnonymized: number;
  permitsDeleted: number;
  environmentalPermitsAnonymized: number;
  environmentalPermitsDeleted: number;
  riskAssessmentsAnonymized: number;
  riskAssessmentsDeleted: number;
}> {
  const batchSize = options?.batchSize ?? 200;
  const now = new Date();
  let anonymized = 0;
  let deleted = 0;
  let observationsAnonymized = 0;
  let observationsDeleted = 0;
  let permitsAnonymized = 0;
  let permitsDeleted = 0;
  let environmentalPermitsAnonymized = 0;
  let environmentalPermitsDeleted = 0;
  let riskAssessmentsAnonymized = 0;
  let riskAssessmentsDeleted = 0;

  /* Incidents — existing behavior */
  const incidentCandidates = await db
    .select({
      id: incident.id,
      organizationId: incident.organizationId,
    })
    .from(incident)
    .where(
      and(
        eq(incident.legalHold, false),
        isNull(incident.anonymizedAt),
        isNotNull(incident.retainUntil),
        lte(incident.retainUntil, now),
      ),
    )
    .limit(batchSize);

  const incidentOrgIds = [...new Set(incidentCandidates.map((c) => c.organizationId))];
  const incidentDeleteOrgs = await orgsWithDeletePolicy(db, incidentOrgIds, "incident_general");

  for (const row of incidentCandidates) {
    const shouldDelete = incidentDeleteOrgs.has(row.organizationId);
    await db.transaction(async (tx) => {
      if (shouldDelete) {
        await tx.delete(incident).where(eq(incident.id, row.id));
        deleted += 1;
        await writeAuditLog(tx, {
          organizationId: row.organizationId,
          actorUserId: null,
          action: "data_lifecycle.delete_incident",
          entityType: "incident",
          entityId: row.id,
          payload: {},
        });
      } else {
        await anonymizeIncidentInTx(tx, {
          organizationId: row.organizationId,
          incidentId: row.id,
        });
        anonymized += 1;
      }
    });
  }

  /* Safety observations with explicit retain_until */
  const observationCandidates = await db
    .select({
      id: safetyObservation.id,
      organizationId: safetyObservation.organizationId,
    })
    .from(safetyObservation)
    .where(
      and(
        eq(safetyObservation.legalHold, false),
        isNull(safetyObservation.anonymizedAt),
        isNotNull(safetyObservation.retainUntil),
        lte(safetyObservation.retainUntil, now),
      ),
    )
    .limit(batchSize);

  const obsOrgIds = [...new Set(observationCandidates.map((c) => c.organizationId))];
  const obsDeleteOrgs = await orgsWithDeletePolicy(db, obsOrgIds, "safety_observation_program");

  for (const row of observationCandidates) {
    const shouldDelete = obsDeleteOrgs.has(row.organizationId);
    await db.transaction(async (tx) => {
      if (shouldDelete) {
        await tx.delete(safetyObservation).where(eq(safetyObservation.id, row.id));
        observationsDeleted += 1;
        await writeAuditLog(tx, {
          organizationId: row.organizationId,
          actorUserId: null,
          action: "data_lifecycle.delete_safety_observation",
          entityType: "safety_observation",
          entityId: row.id,
          payload: {},
        });
      } else {
        await anonymizeSafetyObservationInTx(tx, {
          organizationId: row.organizationId,
          observationId: row.id,
        });
        observationsAnonymized += 1;
      }
    });
  }

  /* Work permits */
  const permitCandidates = await db
    .select({
      id: workPermit.id,
      organizationId: workPermit.organizationId,
    })
    .from(workPermit)
    .where(
      and(
        eq(workPermit.legalHold, false),
        isNull(workPermit.anonymizedAt),
        isNotNull(workPermit.retainUntil),
        lte(workPermit.retainUntil, now),
      ),
    )
    .limit(batchSize);

  const permitOrgIds = [...new Set(permitCandidates.map((c) => c.organizationId))];
  const permitDeleteOrgs = await orgsWithDeletePolicy(db, permitOrgIds, "work_permit_program");

  for (const row of permitCandidates) {
    const shouldDelete = permitDeleteOrgs.has(row.organizationId);
    await db.transaction(async (tx) => {
      if (shouldDelete) {
        await tx.delete(workPermit).where(eq(workPermit.id, row.id));
        permitsDeleted += 1;
        await writeAuditLog(tx, {
          organizationId: row.organizationId,
          actorUserId: null,
          action: "data_lifecycle.delete_work_permit",
          entityType: "work_permit",
          entityId: row.id,
          payload: {},
        });
      } else {
        await anonymizeWorkPermitInTx(tx, {
          organizationId: row.organizationId,
          permitId: row.id,
        });
        permitsAnonymized += 1;
      }
    });
  }

  /* Environmental regulatory permits */
  const envPermitCandidates = await db
    .select({
      id: environmentalRegulatoryPermit.id,
      organizationId: environmentalRegulatoryPermit.organizationId,
    })
    .from(environmentalRegulatoryPermit)
    .where(
      and(
        eq(environmentalRegulatoryPermit.legalHold, false),
        isNull(environmentalRegulatoryPermit.anonymizedAt),
        isNotNull(environmentalRegulatoryPermit.retainUntil),
        lte(environmentalRegulatoryPermit.retainUntil, now),
      ),
    )
    .limit(batchSize);

  const envPermitOrgIds = [...new Set(envPermitCandidates.map((c) => c.organizationId))];
  const envPermitDeleteOrgs = await orgsWithDeletePolicy(
    db,
    envPermitOrgIds,
    "environmental_regulatory_permit_program",
  );

  for (const row of envPermitCandidates) {
    const shouldDelete = envPermitDeleteOrgs.has(row.organizationId);
    await db.transaction(async (tx) => {
      if (shouldDelete) {
        await tx
          .delete(environmentalRegulatoryPermit)
          .where(eq(environmentalRegulatoryPermit.id, row.id));
        environmentalPermitsDeleted += 1;
        await writeAuditLog(tx, {
          organizationId: row.organizationId,
          actorUserId: null,
          action: "data_lifecycle.delete_environmental_regulatory_permit",
          entityType: "environmental_regulatory_permit",
          entityId: row.id,
          payload: {},
        });
      } else {
        await anonymizeEnvironmentalRegulatoryPermitInTx(tx, {
          organizationId: row.organizationId,
          permitId: row.id,
        });
        environmentalPermitsAnonymized += 1;
      }
    });
  }

  /* Risk assessments */
  const riskCandidates = await db
    .select({
      id: riskAssessment.id,
      organizationId: riskAssessment.organizationId,
    })
    .from(riskAssessment)
    .where(
      and(
        eq(riskAssessment.legalHold, false),
        isNull(riskAssessment.anonymizedAt),
        isNotNull(riskAssessment.retainUntil),
        lte(riskAssessment.retainUntil, now),
      ),
    )
    .limit(batchSize);

  const riskOrgIds = [...new Set(riskCandidates.map((c) => c.organizationId))];
  const riskDeleteOrgs = await orgsWithDeletePolicy(db, riskOrgIds, "risk_assessment_program");

  for (const row of riskCandidates) {
    const shouldDelete = riskDeleteOrgs.has(row.organizationId);
    await db.transaction(async (tx) => {
      if (shouldDelete) {
        await tx.delete(riskAssessmentStep).where(eq(riskAssessmentStep.riskAssessmentId, row.id));
        await tx.delete(riskAssessment).where(eq(riskAssessment.id, row.id));
        riskAssessmentsDeleted += 1;
        await writeAuditLog(tx, {
          organizationId: row.organizationId,
          actorUserId: null,
          action: "data_lifecycle.delete_risk_assessment",
          entityType: "risk_assessment",
          entityId: row.id,
          payload: {},
        });
      } else {
        await anonymizeRiskAssessmentInTx(tx, {
          organizationId: row.organizationId,
          riskAssessmentId: row.id,
        });
        riskAssessmentsAnonymized += 1;
      }
    });
  }

  const totalAffected =
    anonymized +
    deleted +
    observationsAnonymized +
    observationsDeleted +
    permitsAnonymized +
    permitsDeleted +
    environmentalPermitsAnonymized +
    environmentalPermitsDeleted +
    riskAssessmentsAnonymized +
    riskAssessmentsDeleted;

  if (totalAffected > 0) {
    await db.insert(dataLifecycleRun).values({
      action: "cron.data_retention",
      recordsAffected: totalAffected,
      details: {
        incidents: { anonymized, deleted },
        safetyObservations: {
          anonymized: observationsAnonymized,
          deleted: observationsDeleted,
        },
        workPermits: { anonymized: permitsAnonymized, deleted: permitsDeleted },
        environmentalRegulatoryPermits: {
          anonymized: environmentalPermitsAnonymized,
          deleted: environmentalPermitsDeleted,
        },
        riskAssessments: {
          anonymized: riskAssessmentsAnonymized,
          deleted: riskAssessmentsDeleted,
        },
        checkedAt: now.toISOString(),
      },
    });
  }

  return {
    anonymized,
    deleted,
    observationsAnonymized,
    observationsDeleted,
    permitsAnonymized,
    permitsDeleted,
    environmentalPermitsAnonymized,
    environmentalPermitsDeleted,
    riskAssessmentsAnonymized,
    riskAssessmentsDeleted,
  };
}
