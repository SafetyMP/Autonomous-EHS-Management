import { router } from "./init";
import { analyticsRouter } from "./routers/analytics";
import { aiAssistantRouter } from "./routers/aiAssistant";
import { aiDraftsRouter } from "./routers/aiDrafts";
import { approvalRouter } from "./routers/approval";
import { aspectRouter } from "./routers/aspect";
import { capaRouter } from "./routers/capa";
import { complianceRouter } from "./routers/complianceRouter";
import { consultationRouter } from "./routers/consultation";
import { contextSyncProtocolRouter } from "./routers/contextSyncProtocol";
import { contextRouter } from "./routers/context";
import { documentRouter } from "./routers/document";
import { emergencyRouter } from "./routers/emergency";
import { environmentalMonitoringRouter } from "./routers/environmentalMonitoring";
import { environmentalRegulatoryPermitRouter } from "./routers/environmentalRegulatoryPermit";
import { externalPartyRouter } from "./routers/externalParty";
import { ehsEvidenceRouter } from "./routers/ehsEvidence";
import { importDataRouter } from "./routers/importData";
import { incidentRouter } from "./routers/incident";
import { inspectionRouter } from "./routers/inspection";
import { integrationRouter } from "./routers/integration";
import { internalAuditRouter } from "./routers/internalAudit";
import { managementReviewRouter } from "./routers/managementReview";
import { observationRouter } from "./routers/observation";
import { obligationRouter } from "./routers/obligation";
import { organizationRouter } from "./routers/organization";
import { permitRouter } from "./routers/permit";
import { planningRouter } from "./routers/planning/index";
import { programRouter } from "./routers/program";
import { ragRouter } from "./routers/rag";
import { tasksRouter } from "./routers/tasks";
import { trainingRouter } from "./routers/training";

export const appRouter = router({
  analytics: analyticsRouter,
  approval: approvalRouter,
  organization: organizationRouter,
  incident: incidentRouter,
  inspection: inspectionRouter,
  permit: permitRouter,
  observation: observationRouter,
  capa: capaRouter,
  aspect: aspectRouter,
  obligation: obligationRouter,
  document: documentRouter,
  ehsEvidence: ehsEvidenceRouter,
  managementReview: managementReviewRouter,
  planning: planningRouter,
  training: trainingRouter,
  internalAudit: internalAuditRouter,
  rag: ragRouter,
  context: contextRouter,
  contextSyncProtocol: contextSyncProtocolRouter,
  consultation: consultationRouter,
  emergency: emergencyRouter,
  environmentalMonitoring: environmentalMonitoringRouter,
  environmentalRegulatoryPermit: environmentalRegulatoryPermitRouter,
  program: programRouter,
  externalParty: externalPartyRouter,
  tasks: tasksRouter,
  integration: integrationRouter,
  aiDrafts: aiDraftsRouter,
  aiAssistant: aiAssistantRouter,
  importData: importDataRouter,
  compliance: complianceRouter,
});

export type AppRouter = typeof appRouter;
