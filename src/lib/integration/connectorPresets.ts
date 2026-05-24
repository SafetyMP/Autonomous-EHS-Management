import type { IntegrationConnectorKey } from "@/lib/integration/connectorKeys";

export type ConnectorPreset = {
  vendor: string;
  label: string;
  connectorKey: IntegrationConnectorKey;
  schemaVersion: number;
  mappingJson: Record<string, unknown>;
  samplePayload?: Record<string, unknown>;
};

export const CONNECTOR_PRESETS: ConnectorPreset[] = [
  {
    vendor: "workday",
    label: "Workday HRIS (iPaaS)",
    connectorKey: "hris_inbound",
    schemaVersion: 2,
    mappingJson: {
      vendor: "workday",
      notesForOperators:
        "Map Workday Worker_ID → externalWorkerId; maintain location→siteId CSV in iPaaS.",
      workdayReport: "RPT_EHS_Worker_Site_Sync",
      trigger: "daily + on effective date change",
      fieldMap: {
        Worker_Email: "workerEmail",
        Worker_ID: "externalWorkerId",
        Location_ID: "siteId",
        Supervisory_Organization: "department",
        Job_Profile: "jobTitle",
        Manager_Email: "managerEmail",
        Active_Status: "employmentStatus",
      },
    },
    samplePayload: {
      kind: "hris_membership_sync",
      organizationId: "00000000-0000-4000-8000-000000000001",
      workerEmail: "alex.worker@portco.example",
      siteId: "00000000-0000-4000-8000-000000000002",
      externalWorkerId: "WD-10482",
      department: "Operations — Plant 3",
      jobTitle: "Production Supervisor",
      managerEmail: "sam.manager@portco.example",
      employmentStatus: "active",
      idempotencyKey: "workday:WD-10482:2026-05-24",
    },
  },
  {
    vendor: "adp",
    label: "ADP Workforce Now (iPaaS)",
    connectorKey: "hris_inbound",
    schemaVersion: 2,
    mappingJson: {
      vendor: "adp",
      notesForOperators: "Map associateOID → externalWorkerId; poll or webhook via iPaaS.",
      trigger: "scheduled poll or ADP webhook",
      fieldMap: {
        "associateOID": "externalWorkerId",
        "businessCommunication.emails": "workerEmail",
        "workAssignments.homeWorkLocation": "siteId",
        "workerStatus.statusCode": "employmentStatus",
      },
    },
    samplePayload: {
      kind: "hris_membership_sync",
      organizationId: "00000000-0000-4000-8000-000000000001",
      workerEmail: "jordan.tech@portco.example",
      externalWorkerId: "ADP-a1b2c3",
      employmentStatus: "active",
      idempotencyKey: "adp:a1b2c3:2026-05-24",
    },
  },
  {
    vendor: "bamboohr",
    label: "BambooHR (iPaaS)",
    connectorKey: "hris_inbound",
    schemaVersion: 2,
    mappingJson: {
      vendor: "bamboohr",
      notesForOperators: "Often paired with Okta SCIM for user create; BambooHR webhook for site/department.",
      trigger: "BambooHR webhook + daily reconcile",
      fieldMap: {
        id: "externalWorkerId",
        workEmail: "workerEmail",
        location: "siteId",
        department: "department",
        jobTitle: "jobTitle",
        supervisorEEmail: "managerEmail",
      },
    },
  },
  {
    vendor: "generic_lms",
    label: "Generic LMS completion",
    connectorKey: "lms_inbound",
    schemaVersion: 1,
    mappingJson: {
      vendor: "generic_lms",
      notesForOperators: "POST training_completion to /api/integration/inbound; reconcile in Training module.",
      fieldMap: {
        workerId: "externalWorkerId",
        courseCode: "courseCode",
        completedAt: "completedAt",
      },
    },
  },
];

export function presetForVendor(vendor: string): ConnectorPreset | undefined {
  return CONNECTOR_PRESETS.find((p) => p.vendor === vendor);
}
