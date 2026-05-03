import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Db } from "@/server/db";
import { membership, permission, rolePermission } from "@/server/db/schema";

export const PERMISSIONS = {
  INCIDENT_CREATE: "incident:create",
  INCIDENT_READ: "incident:read",
  INCIDENT_UPDATE: "incident:update",
  ASPECT_CREATE: "aspect:create",
  ASPECT_READ: "aspect:read",
  ASPECT_UPDATE: "aspect:update",
  OBLIGATION_CREATE: "obligation:create",
  OBLIGATION_READ: "obligation:read",
  OBLIGATION_UPDATE: "obligation:update",
  CAPA_CREATE: "capa:create",
  CAPA_READ: "capa:read",
  CAPA_UPDATE: "capa:update",
  CAPA_APPROVE: "capa:approve",
  DOCUMENT_READ: "document:read",
  DOCUMENT_CREATE: "document:create",
  DOCUMENT_UPDATE: "document:update",
  DOCUMENT_APPROVE: "document:approve",
  MR_READ: "management_review:read",
  MR_CREATE: "management_review:create",
  MR_UPDATE: "management_review:update",
  HAZARD_READ: "hazard:read",
  HAZARD_CREATE: "hazard:create",
  HAZARD_UPDATE: "hazard:update",
  RISK_READ: "risk:read",
  RISK_CREATE: "risk:create",
  RISK_UPDATE: "risk:update",
  OBJECTIVE_READ: "objective:read",
  OBJECTIVE_CREATE: "objective:create",
  OBJECTIVE_UPDATE: "objective:update",
  CONTROL_READ: "operational_control:read",
  CONTROL_CREATE: "operational_control:create",
  CONTROL_UPDATE: "operational_control:update",
  TRAINING_READ: "training:read",
  TRAINING_CREATE: "training:create",
  TRAINING_UPDATE: "training:update",
  AUDIT_READ: "internal_audit:read",
  AUDIT_CREATE: "internal_audit:create",
  AUDIT_UPDATE: "internal_audit:update",
  FINDING_READ: "audit_finding:read",
  FINDING_CREATE: "audit_finding:create",
  RAG_READ: "rag:read",
  RAG_INGEST: "rag:ingest",
  ORG_ADMIN: "org:admin",
  CONTEXT_READ: "context:read",
  CONTEXT_WRITE: "context:write",
  EXTERNAL_PARTY_READ: "external_party:read",
  EXTERNAL_PARTY_WRITE: "external_party:write",
  POLICY_READ: "policy:read",
  POLICY_WRITE: "policy:write",
  WORKER_CONSULT_READ: "worker_consultation:read",
  WORKER_CONSULT_WRITE: "worker_consultation:write",
  CONSULTATION_RECORD_READ: "consultation_record:read",
  CONSULTATION_RECORD_WRITE: "consultation_record:write",
  EMERGENCY_READ: "emergency:read",
  EMERGENCY_WRITE: "emergency:write",
  MOC_READ: "moc:read",
  MOC_WRITE: "moc:write",
  CB_AUDIT_READ: "certification_audit:read",
  CB_AUDIT_WRITE: "certification_audit:write",
  CERTIFICATE_READ: "certificate:read",
  CERTIFICATE_WRITE: "certificate:write",
  KPI_READ: "kpi:read",
  KPI_WRITE: "kpi:write",
  MEASUREMENT_READ: "measurement:read",
  MEASUREMENT_WRITE: "measurement:write",
  ENV_MONITORING_READ: "environmental_monitoring:read",
  ENV_MONITORING_WRITE: "environmental_monitoring:write",
  ENVIRONMENTAL_PERMIT_READ: "environmental_permit:read",
  ENVIRONMENTAL_PERMIT_CREATE: "environmental_permit:create",
  ENVIRONMENTAL_PERMIT_UPDATE: "environmental_permit:update",
  ENVIRONMENTAL_PERMIT_APPROVE: "environmental_permit:approve",
  TASKS_READ: "tasks:read",
  INTEGRATION_READ: "integration:read",
  INTEGRATION_WRITE: "integration:write",
  INSPECTION_READ: "inspection:read",
  INSPECTION_CREATE: "inspection:create",
  INSPECTION_UPDATE: "inspection:update",
  WORK_PERMIT_READ: "work_permit:read",
  WORK_PERMIT_CREATE: "work_permit:create",
  WORK_PERMIT_UPDATE: "work_permit:update",
  WORK_PERMIT_APPROVE: "work_permit:approve",
  SAFETY_OBSERVATION_READ: "safety_observation:read",
  SAFETY_OBSERVATION_CREATE: "safety_observation:create",
  SAFETY_OBSERVATION_UPDATE: "safety_observation:update",
  ORG_SETUP_WRITE: "org_setup:write",
  AI_DRAFT_USE: "ai:draft_use",
  INCIDENT_READ_SENSITIVE: "incident:read_sensitive",
  ESTABLISHMENT_READ: "establishment:read",
  ESTABLISHMENT_WRITE: "establishment:write",
  REGULATORY_OSHA_READ: "regulatory_osha:read",
  REGULATORY_OSHA_WRITE: "regulatory_osha:write",
  RETENTION_POLICY_READ: "retention:policy_read",
  RETENTION_POLICY_WRITE: "retention:policy_write",
  PRIVACY_DSAR_READ: "privacy:dsar_read",
  PRIVACY_DSAR_WRITE: "privacy:dsar_write",
  AUDIT_TRAIL_READ: "audit_trail:read",
  CHEMICAL_INVENTORY_READ: "chemical_inventory:read",
  CHEMICAL_INVENTORY_WRITE: "chemical_inventory:write",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export async function userHasPermission(
  db: Db,
  userId: string,
  organizationId: string,
  key: PermissionKey,
): Promise<boolean> {
  const rows = await db
    .select({ pk: permission.key })
    .from(membership)
    .innerJoin(rolePermission, eq(membership.roleId, rolePermission.roleId))
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(
      and(
        eq(membership.userId, userId),
        eq(membership.organizationId, organizationId),
        eq(permission.key, key),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

export async function assertPermission(
  db: Db,
  userId: string,
  organizationId: string,
  key: PermissionKey,
): Promise<void> {
  const ok = await userHasPermission(db, userId, organizationId, key);
  if (!ok) {
    throw new TRPCError({ code: "FORBIDDEN", message: `Missing permission: ${key}` });
  }
}
