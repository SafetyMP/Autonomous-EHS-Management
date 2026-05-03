/**
 * Removes `[Demo]`-scoped rows for "Demo Organization", then re-runs demo seed.
 * Intended only for throwaway Demo org DBs.
 * Approval requests are deleted when they target demo CAPAs, work permits, or environmental regulatory permits.
 * Also clears demo escalations, integration DLQ rows (`demo.*` types), RAG sources/chunks, evidence placeholders,
 * webhooks (`example.invalid` demo URL), connector mappings flagged `demoFixture`, and risk-assessment steps — then
 * re-seeds. Does not delete global `cron_job_run` (deployment-wide telemetry).
 *
 * Usage: npx tsx scripts/reset-demo-org.ts
 */
import { spawnSync } from "node:child_process";
import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import {
  approvalRequest,
  approvalStep,
  auditFinding,
  certificationBodyAudit,
  complianceObligation,
  contextIssue,
  controlledDocument,
  correctiveAction,
  dataSubjectRequest,
  documentRevision,
  ehsEvidenceAttachment,
  emergencyPrepAsset,
  emergencyScenario,
  environmentalAspect,
  environmentalImpact,
  environmentalMonitoringResult,
  environmentalRegulatoryPermit,
  environmentalRegulatoryPermitCondition,
  escalationEvent,
  establishment,
  establishmentMonthMetrics,
  establishmentYearMetrics,
  externalParty,
  externalPartyCredential,
  hazard,
  incident,
  inspection,
  interestedParty,
  internalAudit,
  integrationConnectorMapping,
  integrationEvent,
  kpiDefinition,
  managementCertificate,
  managementObjective,
  managementOfChange,
  managementReview,
  managementSystemScope,
  measurementRecord,
  obligationAspectLink,
  obligationEvidenceLink,
  operationalWebhookEndpoint,
  organization,
  ragChunk,
  ragSource,
  riskAssessment,
  riskAssessmentStep,
  safetyObservation,
  trainingRecord,
  workPermit,
} from "../src/server/db/schema";
import { demoTitleStartsWith } from "./lib/demo-scope";
import { loadEnvFiles } from "./lib/load-env";

loadEnvFiles();

const DEMO_DOC_PREFIX = "DEMO-%";
const DEMO_DSAR_CONTACT = "demo.dsar.nonexistent@synthetic.example";

async function main() {
  const { db } = await import("../src/server/db");

  const [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.name, "Demo Organization"))
    .limit(1);

  if (!org) {
    console.log('No "Demo Organization" found; nothing to reset.');
    return;
  }

  const oid = org.id;

  await db.delete(escalationEvent).where(eq(escalationEvent.organizationId, oid));

  await db.delete(integrationEvent).where(
    and(eq(integrationEvent.organizationId, oid), like(integrationEvent.eventType, "demo.%")),
  );

  const demoWebhookUrl = "https://example.invalid/ehs-demo-webhook";
  await db
    .delete(operationalWebhookEndpoint)
    .where(
      and(
        eq(operationalWebhookEndpoint.organizationId, oid),
        eq(operationalWebhookEndpoint.targetUrl, demoWebhookUrl),
      ),
    );

  await db
    .delete(integrationConnectorMapping)
    .where(
      and(
        eq(integrationConnectorMapping.organizationId, oid),
        sql`${integrationConnectorMapping.mappingJson}::jsonb @> '{"demoFixture":true}'::jsonb`,
      ),
    );

  await db.delete(ehsEvidenceAttachment).where(
    and(
      eq(ehsEvidenceAttachment.organizationId, oid),
      or(
        demoTitleStartsWith(ehsEvidenceAttachment.fileName),
        like(ehsEvidenceAttachment.storageUri, "%example.invalid%"),
        like(ehsEvidenceAttachment.storageUri, "demo:%"),
      ),
    ),
  );

  const demoRagSourceRows = await db
    .select({ id: ragSource.id })
    .from(ragSource)
    .where(and(eq(ragSource.organizationId, oid), demoTitleStartsWith(ragSource.title)));
  const demoRagSourceIds = demoRagSourceRows.map((r) => r.id);
  if (demoRagSourceIds.length > 0) {
    await db
      .delete(obligationEvidenceLink)
      .where(inArray(obligationEvidenceLink.ragSourceId, demoRagSourceIds));
    await db.delete(ragChunk).where(inArray(ragChunk.sourceId, demoRagSourceIds));
    await db.delete(ragSource).where(inArray(ragSource.id, demoRagSourceIds));
  }

  await db.delete(safetyObservation).where(
    and(eq(safetyObservation.organizationId, oid), demoTitleStartsWith(safetyObservation.summary)),
  );

  await db.delete(inspection).where(and(eq(inspection.organizationId, oid), demoTitleStartsWith(inspection.title)));

  const demoCapaIdRows = await db
    .select({ id: correctiveAction.id })
    .from(correctiveAction)
    .where(and(eq(correctiveAction.organizationId, oid), demoTitleStartsWith(correctiveAction.title)));

  const demoPermitIdRows = await db
    .select({ id: workPermit.id })
    .from(workPermit)
    .where(and(eq(workPermit.organizationId, oid), demoTitleStartsWith(workPermit.title)));

  const demoEnvRegPermitIdRows = await db
    .select({ id: environmentalRegulatoryPermit.id })
    .from(environmentalRegulatoryPermit)
    .where(
      and(
        eq(environmentalRegulatoryPermit.organizationId, oid),
        demoTitleStartsWith(environmentalRegulatoryPermit.title),
      ),
    );

  const demoCapaIds = demoCapaIdRows.map((r) => r.id);
  const demoPermitIds = demoPermitIdRows.map((r) => r.id);
  const demoEnvRegPermitIds = demoEnvRegPermitIdRows.map((r) => r.id);

  const approvalFilterPieces = [
    ...(demoCapaIds.length
      ? [
          and(
            eq(approvalRequest.entityType, "capa"),
            inArray(approvalRequest.entityId, demoCapaIds),
          ),
        ]
      : []),
    ...(demoPermitIds.length
      ? [
          and(
            eq(approvalRequest.entityType, "work_permit"),
            inArray(approvalRequest.entityId, demoPermitIds),
          ),
        ]
      : []),
    ...(demoEnvRegPermitIds.length
      ? [
          and(
            eq(approvalRequest.entityType, "environmental_regulatory_permit"),
            inArray(approvalRequest.entityId, demoEnvRegPermitIds),
          ),
        ]
      : []),
  ];

  const approvalWhere =
    approvalFilterPieces.length === 0
      ? null
      : approvalFilterPieces.length === 1
        ? approvalFilterPieces[0]!
        : or(...approvalFilterPieces);

  const demoApprovalReqIds = approvalWhere
    ? await db
        .select({ id: approvalRequest.id })
        .from(approvalRequest)
        .where(and(eq(approvalRequest.organizationId, oid), approvalWhere))
    : [];

  if (demoApprovalReqIds.length > 0) {
    await db.delete(approvalStep).where(
      inArray(
        approvalStep.requestId,
        demoApprovalReqIds.map((r) => r.id),
      ),
    );
    await db.delete(approvalRequest).where(
      inArray(
        approvalRequest.id,
        demoApprovalReqIds.map((r) => r.id),
      ),
    );
  }

  await db.delete(workPermit).where(and(eq(workPermit.organizationId, oid), demoTitleStartsWith(workPermit.title)));

  await db.delete(dataSubjectRequest).where(
    and(eq(dataSubjectRequest.organizationId, oid), eq(dataSubjectRequest.subjectContact, DEMO_DSAR_CONTACT)),
  );

  await db.delete(certificationBodyAudit).where(
    and(
      eq(certificationBodyAudit.organizationId, oid),
      demoTitleStartsWith(certificationBodyAudit.certificationBodyName),
    ),
  );

  await db.delete(managementCertificate).where(
    and(eq(managementCertificate.organizationId, oid), demoTitleStartsWith(managementCertificate.standardName)),
  );

  const demoAspectRows = await db
    .select({ id: environmentalAspect.id })
    .from(environmentalAspect)
    .where(and(eq(environmentalAspect.organizationId, oid), demoTitleStartsWith(environmentalAspect.name)));

  const demoOblRows = await db
    .select({ id: complianceObligation.id })
    .from(complianceObligation)
    .where(and(eq(complianceObligation.organizationId, oid), demoTitleStartsWith(complianceObligation.title)));

  const demoAspectIds = demoAspectRows.map((r) => r.id);
  const demoOblIds = demoOblRows.map((r) => r.id);

  const monitoringPieces = [
    ...(demoAspectIds.length
      ? [inArray(environmentalMonitoringResult.environmentalAspectId, demoAspectIds)]
      : []),
    ...(demoOblIds.length
      ? [inArray(environmentalMonitoringResult.complianceObligationId, demoOblIds)]
      : []),
    ...(demoEnvRegPermitIds.length
      ? [
          inArray(
            environmentalMonitoringResult.environmentalRegulatoryPermitId,
            demoEnvRegPermitIds,
          ),
        ]
      : []),
  ];
  const monitoringCond =
    monitoringPieces.length === 0
      ? null
      : monitoringPieces.length === 1
        ? monitoringPieces[0]!
        : or(...monitoringPieces);

  if (monitoringCond) {
    await db
      .delete(environmentalMonitoringResult)
      .where(and(eq(environmentalMonitoringResult.organizationId, oid), monitoringCond));
  }

  if (demoEnvRegPermitIds.length > 0) {
    await db
      .delete(environmentalRegulatoryPermitCondition)
      .where(
        inArray(environmentalRegulatoryPermitCondition.permitId, demoEnvRegPermitIds),
      );
    await db
      .delete(environmentalRegulatoryPermit)
      .where(inArray(environmentalRegulatoryPermit.id, demoEnvRegPermitIds));
  }

  const linkPieces = [
    ...(demoOblIds.length ? [inArray(obligationAspectLink.obligationId, demoOblIds)] : []),
    ...(demoAspectIds.length ? [inArray(obligationAspectLink.aspectId, demoAspectIds)] : []),
  ];
  const linkCond =
    linkPieces.length === 0 ? null : linkPieces.length === 1 ? linkPieces[0]! : or(...linkPieces);

  if (linkCond) {
    await db.delete(obligationAspectLink).where(linkCond);
  }

  if (demoAspectIds.length > 0) {
    await db.delete(environmentalImpact).where(inArray(environmentalImpact.aspectId, demoAspectIds));
  }

  await db
    .delete(complianceObligation)
    .where(and(eq(complianceObligation.organizationId, oid), demoTitleStartsWith(complianceObligation.title)));

  await db
    .delete(environmentalAspect)
    .where(and(eq(environmentalAspect.organizationId, oid), demoTitleStartsWith(environmentalAspect.name)));

  const demoRiskRows = await db
    .select({ id: riskAssessment.id })
    .from(riskAssessment)
    .where(and(eq(riskAssessment.organizationId, oid), demoTitleStartsWith(riskAssessment.context)));
  const demoRiskIds = demoRiskRows.map((r) => r.id);
  if (demoRiskIds.length > 0) {
    await db
      .delete(riskAssessmentStep)
      .where(inArray(riskAssessmentStep.riskAssessmentId, demoRiskIds));
  }
  await db.delete(riskAssessment).where(and(eq(riskAssessment.organizationId, oid), demoTitleStartsWith(riskAssessment.context)));

  await db.delete(hazard).where(and(eq(hazard.organizationId, oid), demoTitleStartsWith(hazard.title)));

  const demoKpiRows = await db
    .select({ id: kpiDefinition.id })
    .from(kpiDefinition)
    .where(and(eq(kpiDefinition.organizationId, oid), demoTitleStartsWith(kpiDefinition.name)));

  const demoKpiIds = demoKpiRows.map((r) => r.id);
  if (demoKpiIds.length > 0) {
    await db
      .delete(measurementRecord)
      .where(
        and(eq(measurementRecord.organizationId, oid), inArray(measurementRecord.kpiDefinitionId, demoKpiIds)),
      );
  }

  await db.delete(kpiDefinition).where(and(eq(kpiDefinition.organizationId, oid), demoTitleStartsWith(kpiDefinition.name)));

  await db
    .delete(managementObjective)
    .where(and(eq(managementObjective.organizationId, oid), demoTitleStartsWith(managementObjective.title)));

  await db.delete(managementReview).where(
    and(eq(managementReview.organizationId, oid), demoTitleStartsWith(managementReview.summary)),
  );

  const demoScenarioRows = await db
    .select({ id: emergencyScenario.id })
    .from(emergencyScenario)
    .where(and(eq(emergencyScenario.organizationId, oid), demoTitleStartsWith(emergencyScenario.name)));

  const demoScenarioIds = demoScenarioRows.map((r) => r.id);

  if (demoScenarioIds.length > 0) {
    await db.delete(emergencyPrepAsset).where(inArray(emergencyPrepAsset.scenarioId, demoScenarioIds));
    await db.delete(emergencyScenario).where(inArray(emergencyScenario.id, demoScenarioIds));
  }

  await db
    .delete(managementOfChange)
    .where(and(eq(managementOfChange.organizationId, oid), demoTitleStartsWith(managementOfChange.title)));

  const demoPartyRows = await db
    .select({ id: externalParty.id })
    .from(externalParty)
    .where(and(eq(externalParty.organizationId, oid), demoTitleStartsWith(externalParty.companyName)));

  const demoPartyIds = demoPartyRows.map((r) => r.id);

  if (demoPartyIds.length > 0) {
    await db.delete(externalPartyCredential).where(inArray(externalPartyCredential.externalPartyId, demoPartyIds));
    await db.delete(externalParty).where(inArray(externalParty.id, demoPartyIds));
  }

  await db
    .delete(contextIssue)
    .where(and(eq(contextIssue.organizationId, oid), demoTitleStartsWith(contextIssue.description)));

  await db.delete(interestedParty).where(and(eq(interestedParty.organizationId, oid), demoTitleStartsWith(interestedParty.name)));

  await db
    .delete(managementSystemScope)
    .where(and(eq(managementSystemScope.organizationId, oid), demoTitleStartsWith(managementSystemScope.statement)));

  const demoAuditIds = db
    .select({ id: internalAudit.id })
    .from(internalAudit)
    .where(and(eq(internalAudit.organizationId, oid), demoTitleStartsWith(internalAudit.title)));

  await db.delete(auditFinding).where(inArray(auditFinding.internalAuditId, demoAuditIds));

  await db.delete(internalAudit).where(
    and(eq(internalAudit.organizationId, oid), demoTitleStartsWith(internalAudit.title)),
  );

  const demoDocIds = db
    .select({ id: controlledDocument.id })
    .from(controlledDocument)
    .where(
      and(
        eq(controlledDocument.organizationId, oid),
        like(controlledDocument.documentNumber, DEMO_DOC_PREFIX),
      ),
    );

  await db.delete(documentRevision).where(inArray(documentRevision.documentId, demoDocIds));

  await db
    .delete(controlledDocument)
    .where(
      and(
        eq(controlledDocument.organizationId, oid),
        like(controlledDocument.documentNumber, DEMO_DOC_PREFIX),
      ),
    );

  await db
    .delete(trainingRecord)
    .where(and(eq(trainingRecord.organizationId, oid), demoTitleStartsWith(trainingRecord.courseTitle)));

  const demoEstRows = await db
    .select({ id: establishment.id })
    .from(establishment)
    .where(and(eq(establishment.organizationId, oid), demoTitleStartsWith(establishment.name)));

  const demoEstIds = demoEstRows.map((r) => r.id);
  if (demoEstIds.length > 0) {
    await db
      .delete(establishmentMonthMetrics)
      .where(inArray(establishmentMonthMetrics.establishmentId, demoEstIds));
    await db
      .delete(establishmentYearMetrics)
      .where(inArray(establishmentYearMetrics.establishmentId, demoEstIds));
    await db.delete(establishment).where(inArray(establishment.id, demoEstIds));
  }

  await db
    .delete(correctiveAction)
    .where(and(eq(correctiveAction.organizationId, oid), demoTitleStartsWith(correctiveAction.title)));

  await db.delete(incident).where(and(eq(incident.organizationId, oid), demoTitleStartsWith(incident.title)));

  console.log("Cleared demo-scoped rows. Repopulating…");
  const r = spawnSync("npm", ["run", "db:seed:demo"], {
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
