import { and, eq, isNotNull, isNull, lte } from "drizzle-orm";
import type { Db } from "@/server/db";
import {
  dataLifecycleRun,
  dataRetentionPolicy,
  incident,
  workRelatedInjuryIllnessRecord,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";

type Tx = Pick<Db, "insert" | "update" | "delete">;

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

/**
 * Processes incidents past `retain_until` without `legal_hold`.
 * Deletes only when org has an explicit `data_retention_policy` row with
 * `record_class = incident_general` and `action = delete`. Otherwise anonymizes.
 */
export async function runDataRetentionCron(db: Db): Promise<{
  anonymized: number;
  deleted: number;
}> {
  const now = new Date();
  const candidates = await db
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
    .limit(200);

  const orgIds = [...new Set(candidates.map((c) => c.organizationId))];
  const deleteOrgIds = new Set<string>();

  for (const orgId of orgIds) {
    const [row] = await db
      .select({ id: dataRetentionPolicy.id })
      .from(dataRetentionPolicy)
      .where(
        and(
          eq(dataRetentionPolicy.organizationId, orgId),
          eq(dataRetentionPolicy.recordClass, "incident_general"),
          eq(dataRetentionPolicy.action, "delete"),
        ),
      )
      .limit(1);
    if (row) deleteOrgIds.add(orgId);
  }

  let anonymized = 0;
  let deleted = 0;

  for (const row of candidates) {
    const shouldDelete = deleteOrgIds.has(row.organizationId);

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

  if (anonymized > 0 || deleted > 0) {
    await db.insert(dataLifecycleRun).values({
      action: "cron.data_retention",
      recordsAffected: anonymized + deleted,
      details: { anonymized, deleted, checkedAt: now.toISOString() },
    });
  }

  return { anonymized, deleted };
}
