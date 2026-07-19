import { relations, sql } from "drizzle-orm";
import {
  boolean,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/** pgvector column — run `CREATE EXTENSION IF NOT EXISTS vector` on the database before migrate. */
const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
});

/* ——— Better Auth (PostgreSQL) ——— */
export const authUser = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const authSession = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const authAccount = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
    mode: "date",
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
    mode: "date",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const authVerification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow(),
});

export const authUserRelations = relations(authUser, ({ many }) => ({
  sessions: many(authSession),
  accounts: many(authAccount),
}));

export const authSessionRelations = relations(authSession, ({ one }) => ({
  user: one(authUser, {
    fields: [authSession.userId],
    references: [authUser.id],
  }),
}));

export const authAccountRelations = relations(authAccount, ({ one }) => ({
  user: one(authUser, {
    fields: [authAccount.userId],
    references: [authUser.id],
  }),
}));

/* ——— RBAC & multi-tenant ——— */
export const organization = pgTable("organization", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  /** Per-organization shared secret for POST /api/integration/inbound (Bearer). */
  integrationInboundSecret: varchar("integration_inbound_secret", { length: 256 }),
  /**
   * Tenant master switch for REST `/api/contextsync/*` + `contextSyncProtocol` tRPC.
   * Existing orgs are backfilled true in migration; new rows default false at DB level.
   */
  contextSyncEnabled: boolean("context_sync_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const site = pgTable("site", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 256 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const permission = pgTable("permission", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  description: varchar("description", { length: 512 }),
});

export const role = pgTable("role", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull(),
});

export const rolePermission = pgTable(
  "role_permission",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permission.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const membershipEmploymentStatusEnum = pgEnum("membership_employment_status", [
  "active",
  "terminated",
  "leave",
]);

export const membershipLifecycleStatusEnum = pgEnum("membership_lifecycle_status", [
  "active",
  "suspended",
  "deprovisioned",
]);

export const membership = pgTable("membership", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  roleId: uuid("role_id")
    .notNull()
    .references(() => role.id, { onDelete: "restrict" }),
  /** HRIS worker id (e.g. Workday Worker_ID) — optional sync from inbound webhook. */
  externalWorkerId: varchar("external_worker_id", { length: 128 }),
  department: varchar("department", { length: 256 }),
  jobTitle: varchar("job_title", { length: 256 }),
  managerUserId: text("manager_user_id").references(() => authUser.id, { onDelete: "set null" }),
  costCenter: varchar("cost_center", { length: 128 }),
  employmentStatus: membershipEmploymentStatusEnum("employment_status"),
  lifecycleStatus: membershipLifecycleStatusEnum("lifecycle_status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const organizationRelations = relations(organization, ({ many }) => ({
  sites: many(site),
  roles: many(role),
  memberships: many(membership),
}));

export const siteRelations = relations(site, ({ one, many }) => ({
  organization: one(organization, {
    fields: [site.organizationId],
    references: [organization.id],
  }),
  memberships: many(membership),
}));

export const roleRelations = relations(role, ({ one, many }) => ({
  organization: one(organization, {
    fields: [role.organizationId],
    references: [organization.id],
  }),
  rolePermissions: many(rolePermission),
  memberships: many(membership),
}));

export const membershipRelations = relations(membership, ({ one }) => ({
  user: one(authUser, { fields: [membership.userId], references: [authUser.id] }),
  organization: one(organization, {
    fields: [membership.organizationId],
    references: [organization.id],
  }),
  site: one(site, { fields: [membership.siteId], references: [site.id] }),
  role: one(role, { fields: [membership.roleId], references: [role.id] }),
  manager: one(authUser, { fields: [membership.managerUserId], references: [authUser.id] }),
}));

/* ——— Audit trail ——— */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    actorUserId: text("actor_user_id").references(() => authUser.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 128 }).notNull(),
    entityType: varchar("entity_type", { length: 128 }).notNull(),
    entityId: varchar("entity_id", { length: 256 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_log_organization_created_idx").on(t.organizationId, t.createdAt),
    index("audit_log_organization_entity_type_idx").on(t.organizationId, t.entityType),
  ],
);

/**
 * Platform cron executions for observability (Prometheus scrape, SLO tracking).
 * Not org-scoped — jobs are deployment-wide.
 */
export const cronJobRun = pgTable(
  "cron_job_run",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobKey: varchar("job_key", { length: 64 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }).notNull(),
    ok: boolean("ok").notNull(),
    durationMs: integer("duration_ms").notNull(),
    errorMessage: text("error_message"),
  },
  (t) => [index("cron_job_run_job_started_idx").on(t.jobKey, t.startedAt)],
);

/**
 * Client-supplied keys (e.g. offline outbox `localId`) for exactly-once mutations per actor.
 * Stored JSON replays may contain date fields as ISO strings.
 */
export const mutationIdempotency = pgTable(
  "mutation_idempotency",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    clientKey: varchar("client_key", { length: 128 }).notNull(),
    procedure: varchar("procedure", { length: 128 }).notNull(),
    responseJson: jsonb("response_json").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("mutation_idempotency_org_actor_client_uq").on(
      t.organizationId,
      t.actorUserId,
      t.clientKey,
    ),
    index("mutation_idempotency_org_created_idx").on(t.organizationId, t.createdAt),
  ],
);

/* ——— ISO 14001 §4 context of the organization ——— */
export const contextIssueKindEnum = pgEnum("context_issue_kind", ["internal", "external"]);

/** ContextSync provenance operations (subset of protocol semantics). */
export const contextSyncProvOpEnum = pgEnum("context_sync_prov_operation", ["read", "write"]);

export const managementSystemScope = pgTable("management_system_scope", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  /** EMS/OH&MS scope statement (sites, products, boundaries). */
  statement: text("statement").notNull(),
  /** Covered site IDs; empty array = organization-wide. */
  coveredSiteIds: jsonb("covered_site_ids").$type<string[]>().notNull().$defaultFn(() => []),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const contextIssue = pgTable("context_issue", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  kind: contextIssueKindEnum("kind").notNull(),
  category: varchar("category", { length: 128 }).notNull(),
  /** ISO 14001:2026 Clause 4.1 named environmental conditions (programme tags). */
  environmentalConditionTags: jsonb("environmental_condition_tags")
    .$type<string[]>()
    .notNull()
    .$defaultFn(() => []),
  description: text("description").notNull(),
  reviewDue: timestamp("review_due", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const interestedParty = pgTable("interested_party", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 512 }).notNull(),
  requirementsExpectations: text("requirements_expectations"),
  influenceNotes: text("influence_notes"),
  reviewDue: timestamp("review_due", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const managementSystemScopeRelations = relations(managementSystemScope, ({ one }) => ({
  organization: one(organization, {
    fields: [managementSystemScope.organizationId],
    references: [organization.id],
  }),
}));

export const contextIssueRelations = relations(contextIssue, ({ one }) => ({
  organization: one(organization, {
    fields: [contextIssue.organizationId],
    references: [organization.id],
  }),
}));

export const interestedPartyRelations = relations(interestedParty, ({ one }) => ({
  organization: one(organization, {
    fields: [interestedParty.organizationId],
    references: [organization.id],
  }),
}));

export const externalPartyTypeEnum = pgEnum("external_party_type", [
  "contractor",
  "visitor",
  "temporary_worker",
]);

export const externalParty = pgTable("external_party", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  partyType: externalPartyTypeEnum("party_type").notNull(),
  companyName: varchar("company_name", { length: 512 }).notNull(),
  contactName: varchar("contact_name", { length: 256 }),
  contactEmail: varchar("contact_email", { length: 256 }),
  /** HRIS/VMS worker id when synced from upstream contractor roster. */
  externalWorkerId: varchar("external_worker_id", { length: 128 }),
  hrisSource: varchar("hris_source", { length: 64 }),
  hseRequirementsNote: text("hse_requirements_note"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const externalPartyRelations = relations(externalParty, ({ one, many }) => ({
  organization: one(organization, {
    fields: [externalParty.organizationId],
    references: [organization.id],
  }),
  site: one(site, {
    fields: [externalParty.siteId],
    references: [site.id],
  }),
  credentials: many(externalPartyCredential),
}));

/** Insurance COI, permits, training proof, and other contractor / visitor evidence. */
export const externalPartyCredentialKindEnum = pgEnum("external_party_credential_kind", [
  "insurance_coi",
  "permit",
  "training_proof",
  "other",
]);

export const externalPartyCredentialStatusEnum = pgEnum("external_party_credential_status", [
  "pending_review",
  "active",
  "expired",
  "rejected",
]);

export const externalPartyCredential = pgTable("external_party_credential", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  externalPartyId: uuid("external_party_id")
    .notNull()
    .references(() => externalParty.id, { onDelete: "cascade" }),
  kind: externalPartyCredentialKindEnum("kind").notNull(),
  status: externalPartyCredentialStatusEnum("status").notNull().default("pending_review"),
  identifier: varchar("identifier", { length: 512 }),
  validFrom: timestamp("valid_from", { withTimezone: true, mode: "date" }),
  validTo: timestamp("valid_to", { withTimezone: true, mode: "date" }),
  /** Stub URL or object key for uploaded evidence; treat as sensitive in production. */
  evidenceUri: varchar("evidence_uri", { length: 2048 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const externalPartyCredentialRelations = relations(externalPartyCredential, ({ one }) => ({
  organization: one(organization, {
    fields: [externalPartyCredential.organizationId],
    references: [organization.id],
  }),
  externalParty: one(externalParty, {
    fields: [externalPartyCredential.externalPartyId],
    references: [externalParty.id],
  }),
}));

/* ——— ISO 45001 / incidents & CAPA ——— */
export const incidentSeverityEnum = pgEnum("incident_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const incidentStatusEnum = pgEnum("incident_status", [
  "open",
  "investigating",
  "closed",
]);

export const incidentTypeEnum = pgEnum("incident_type", [
  "injury",
  "ill_health",
  "near_miss",
  "environmental",
  "property_damage",
  "other",
]);

/** 29 CFR 1904–style case classification for Form 300 columns (excluding privacy flag). */
export const oshaRecordableClassificationEnum = pgEnum("osha_recordable_classification", [
  "death",
  "days_away",
  "job_transfer_restriction",
  "other_recordable",
]);

/** Primary recordkeeping rule set for the case (federal vs state plan / supplemental state law). */
export const oshaRecordkeepingFrameworkEnum = pgEnum("osha_recordkeeping_framework", [
  "federal_29_cfr_1904",
  "state_plan",
  "state_statute_supplement",
  "undetermined",
]);

export const oshaRecordDeterminationStatusEnum = pgEnum("osha_record_determination_status", [
  "draft",
  "under_review",
  "determined",
]);

/** OSHA Form 300 injury / illness category (columns G–K style). */
export const injuryIllnessCategoryEnum = pgEnum("injury_illness_category", [
  "injury",
  "skin_disorder",
  "respiratory_condition",
  "poisoning",
  "hearing_loss",
  "other_illness",
]);

export const dataRetentionActionEnum = pgEnum("data_retention_action", [
  "hold",
  "anonymize",
  "delete",
]);

export const dataRetentionRecordClassEnum = pgEnum("data_retention_record_class", [
  "incident_general",
  "osha_record",
  "gdpr_personal_data",
  "controlled_document",
  "safety_observation_program",
  "work_permit_program",
  "environmental_regulatory_permit_program",
  "risk_assessment_program",
]);

/** How `minimum_years` maps to `retain_until` for incidents (per jurisdiction row). */
export const retentionDateAnchorEnum = pgEnum("retention_date_anchor", [
  "rolling_from_event",
  "calendar_year_end",
]);

export const incident = pgTable(
  "incident",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
    title: varchar("title", { length: 512 }).notNull(),
    description: text("description").notNull(),
    incidentType: incidentTypeEnum("incident_type").notNull().default("other"),
    severity: incidentSeverityEnum("severity").notNull().default("medium"),
    status: incidentStatusEnum("status").notNull().default("open"),
    reportedByUserId: text("reported_by_user_id").references(() => authUser.id, {
      onDelete: "set null",
    }),
    investigationOwnerUserId: text("investigation_owner_user_id").references(() => authUser.id, {
      onDelete: "set null",
    }),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }),
    externalPartyId: uuid("external_party_id").references(() => externalParty.id, {
      onDelete: "set null",
    }),
    immediateActions: text("immediate_actions"),
    regulatoryNotificationRequired: boolean("regulatory_notification_required")
      .notNull()
      .default(false),
    investigationNotes: text("investigation_notes"),
    rootCauseSummary: text("root_cause_summary"),
    linkedHazardId: uuid("linked_hazard_id"),
    linkedEnvironmentalAspectId: uuid("linked_environmental_aspect_id"),
    /** Blocks automated retention actions for this incident. */
    legalHold: boolean("legal_hold").notNull().default(false),
    /** When set and in the past, cron may anonymize/delete per org policy (if not legally held). */
    retainUntil: timestamp("retain_until", { withTimezone: true, mode: "date" }),
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true, mode: "date" }),
    /** Stable pseudonym for analytics after anonymization. */
    pseudonymId: varchar("pseudonym_id", { length: 64 }),
    /** Structured 5-Whys steps (ISO investigation support); max length enforced in API. */
    rcaFiveWhys: jsonb("rca_five_whys").$type<{ why: string; answer: string }[]>(),
    /** Ishikawa (fishbone) branches: six canonical categories, causes per bone (API-normalized). */
    rcaFishbone: jsonb("rca_fishbone").$type<
      { categoryId: string; causes: string[] }[]
    >(),
    contributingFactors: jsonb("contributing_factors").$type<string[]>(),
    /** Bow-tie barrier model: top event, threats with preventive barriers, consequences with mitigative barriers. */
    investigationBowTie: jsonb("investigation_bow_tie").$type<{
      topEvent: string;
      threats: {
        description: string;
        preventiveBarriers: { description: string; outcome: string }[];
      }[];
      consequences: {
        description: string;
        mitigativeBarriers: { description: string; outcome: string }[];
      }[];
      notes: string | null;
    } | null>(),
    /** Ordered event sequence for investigation traceability. */
    investigationChronology: jsonb("investigation_chronology").$type<
      | {
          sortOrder: number;
          occurredAt: Date | null;
          description: string;
        }[]
      | null
    >(),
    /** Generic causal-factor rows (defenses/barriers failed, etc.). */
    investigationCausalFactors: jsonb("investigation_causal_factors").$type<
      | {
          summary: string;
          category: string | null;
          barriersFailed: string[];
        }[]
      | null
    >(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("incident_retention_cron_idx").on(
      t.organizationId,
      t.legalHold,
      t.retainUntil,
      t.anonymizedAt,
    ),
  ],
);

export const ehsEvidenceEntityTypeEnum = pgEnum("ehs_evidence_entity_type", [
  "incident",
  "corrective_action",
]);

/** Registry for evidence files; bytes live at storageUri (object store URL or org-approved URI scheme). */
export const ehsEvidenceAttachment = pgTable(
  "ehs_evidence_attachment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    entityType: ehsEvidenceEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    fileName: varchar("file_name", { length: 512 }).notNull(),
    mimeType: varchar("mime_type", { length: 256 }).notNull(),
    byteSize: integer("byte_size").notNull(),
    storageUri: text("storage_uri").notNull(),
    sha256Hex: varchar("sha256_hex", { length: 64 }),
    uploadedByUserId: text("uploaded_by_user_id").references(() => authUser.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ehs_evidence_org_entity_idx").on(t.organizationId, t.entityType, t.entityId),
  ],
);

/** Pseudonymous person for injured workers (decoupled from auth users where appropriate). */
export const personSubject = pgTable("person_subject", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  displayPseudonym: varchar("display_pseudonym", { length: 64 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

/** Employer establishment (OSHA / Tier II reporting unit). May link to a `site`. */
export const establishment = pgTable("establishment", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  name: varchar("name", { length: 256 }).notNull(),
  addressLine1: varchar("address_line_1", { length: 512 }),
  city: varchar("city", { length: 128 }),
  region: varchar("region", { length: 128 }),
  postalCode: varchar("postal_code", { length: 32 }),
  country: varchar("country", { length: 2 }),
  naicsCode: varchar("naics_code", { length: 6 }),
  epaFacilityId: varchar("epa_facility_id", { length: 64 }),
  stateFacilityId: varchar("state_facility_id", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

/** Annual hours / headcount for incidence rates and OSHA 300A–style metrics. */
export const establishmentYearMetrics = pgTable(
  "establishment_year_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    establishmentId: uuid("establishment_id")
      .notNull()
      .references(() => establishment.id, { onDelete: "cascade" }),
    calendarYear: integer("calendar_year").notNull(),
    avgEmployees: integer("avg_employees"),
    totalHoursWorked: integer("total_hours_worked"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("establishment_year_metrics_uniq").on(t.establishmentId, t.calendarYear)],
);

/** Monthly hours roll-up for incidence-rate denominators (payroll-style entry). */
export const establishmentMonthMetrics = pgTable(
  "establishment_month_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    establishmentId: uuid("establishment_id")
      .notNull()
      .references(() => establishment.id, { onDelete: "cascade" }),
    calendarYear: integer("calendar_year").notNull(),
    calendarMonth: integer("calendar_month").notNull(),
    hoursWorked: integer("hours_worked"),
    avgEmployees: integer("avg_employees"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("establishment_month_metrics_uniq").on(
      t.establishmentId,
      t.calendarYear,
      t.calendarMonth,
    ),
  ],
);

/**
 * OSHA-oriented sidecar for an ISO incident (Form 300/301–style structured fields).
 * `supplementary_details_ciphertext` holds optional app-layer KMS ciphertext for restricted narrative.
 */
export const workRelatedInjuryIllnessRecord = pgTable(
  "work_related_injury_illness_record",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incident.id, { onDelete: "cascade" }),
    establishmentId: uuid("establishment_id").references(() => establishment.id, {
      onDelete: "set null",
    }),
    injuredPersonSubjectId: uuid("injured_person_subject_id").references(
      () => personSubject.id,
      { onDelete: "set null" },
    ),
    oshaRecordable: boolean("osha_recordable").notNull().default(false),
    recordableClassification: oshaRecordableClassificationEnum("recordable_classification"),
    recordkeepingFramework: oshaRecordkeepingFrameworkEnum("recordkeeping_framework")
      .notNull()
      .default("undetermined"),
    /** US state postal code when state_plan / state_statute_supplement applies (e.g. CA, WA). */
    recordkeepingStateCode: varchar("recordkeeping_state_code", { length: 2 }),
    /** Citation or program name for state-specific obligations (counsel-verified). */
    stateRuleReference: varchar("state_rule_reference", { length: 512 }),
    /** Free text when federal vs state outcomes differ or analysis is pending. */
    jurisdictionNotes: text("jurisdiction_notes"),
    determinationStatus: oshaRecordDeterminationStatusEnum("determination_status")
      .notNull()
      .default("draft"),
    classificationRationale: text("classification_rationale"),
    workRelatedRationale: text("work_related_rationale"),
    phcpDeterminationSummary: text("phcp_determination_summary"),
    determinedAt: timestamp("determined_at", { withTimezone: true, mode: "date" }),
    determinedByUserId: text("determined_by_user_id").references(() => authUser.id, {
      onDelete: "set null",
    }),
    daysAway: integer("days_away"),
    daysRestricted: integer("days_restricted"),
    caseNumberEstablishment: varchar("case_number_establishment", { length: 64 }),
    privacyCase: boolean("privacy_case").notNull().default(false),
    jobTitle: varchar("job_title", { length: 256 }),
    dateHired: timestamp("date_hired", { withTimezone: true, mode: "date" }),
    injuryIllnessCategory: injuryIllnessCategoryEnum("injury_illness_category"),
    bodyPart: text("body_part"),
    objectSubstance: text("object_substance"),
    physicianFacilityNote: text("physician_facility_note"),
    supplementaryDetailsCiphertext: text("supplementary_details_ciphertext"),
    retainUntil: timestamp("retain_until", { withTimezone: true, mode: "date" }),
    legalHold: boolean("legal_hold").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("work_related_injury_illness_record_incident_uniq").on(t.incidentId)],
);

/** Org-scoped retention policy matrix (counsel defines `minimum_years` meaning per jurisdiction). */
export const dataRetentionPolicy = pgTable(
  "data_retention_policy",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    jurisdiction: varchar("jurisdiction", { length: 64 }).notNull(),
    recordClass: dataRetentionRecordClassEnum("record_class").notNull(),
    minimumYears: integer("minimum_years").notNull(),
    action: dataRetentionActionEnum("action").notNull(),
    retentionDateAnchor: retentionDateAnchorEnum("retention_date_anchor")
      .notNull()
      .default("rolling_from_event"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("data_retention_policy_uniq").on(t.organizationId, t.jurisdiction, t.recordClass)],
);

/** Intake status for data-subject / privacy requests (scaffold; see docs/DSAR_PROCESS.md). */
export const dataSubjectRequestStatusEnum = pgEnum("data_subject_request_status", [
  "received",
  "in_review",
  "closed",
]);

/** Org-scoped DSAR / privacy request ticket — not an automated export. */
export const dataSubjectRequest = pgTable(
  "data_subject_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    status: dataSubjectRequestStatusEnum("status").notNull().default("received"),
    subjectContact: varchar("subject_contact", { length: 512 }).notNull(),
    requestType: varchar("request_type", { length: 128 }).notNull(),
    notes: text("notes"),
    createdByUserId: text("created_by_user_id").references(() => authUser.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("data_subject_request_org_idx").on(t.organizationId)],
);

/** Evidence of data lifecycle cron runs (complement to audit_log row-level events). */
export const dataLifecycleRun = pgTable("data_lifecycle_run", {
  id: uuid("id").defaultRandom().primaryKey(),
  runAt: timestamp("run_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  action: varchar("action", { length: 128 }).notNull(),
  recordsAffected: integer("records_affected").notNull().default(0),
  details: jsonb("details").$type<Record<string, unknown>>(),
});

/** Chemical identity for Tier II–style program tracking (not a regulatory submission). */
export const regulatoryChemical = pgTable(
  "regulatory_chemical",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 512 }).notNull(),
    casNumber: varchar("cas_number", { length: 32 }),
    alternateId: varchar("alternate_id", { length: 128 }),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("regulatory_chemical_org_cas_idx").on(t.organizationId, t.casNumber)],
);

export const safetyDataSheetRef = pgTable("safety_data_sheet_ref", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  regulatoryChemicalId: uuid("regulatory_chemical_id").references(() => regulatoryChemical.id, {
    onDelete: "set null",
  }),
  title: varchar("title", { length: 512 }).notNull(),
  revision: varchar("revision", { length: 64 }),
  storageUrl: varchar("storage_url", { length: 2048 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

/** Snapshot of maximum on-hand amount per reporting year (EPCRA Tier II program aid). */
export const facilityChemicalInventory = pgTable(
  "facility_chemical_inventory",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    establishmentId: uuid("establishment_id")
      .notNull()
      .references(() => establishment.id, { onDelete: "cascade" }),
    regulatoryChemicalId: uuid("regulatory_chemical_id")
      .notNull()
      .references(() => regulatoryChemical.id, { onDelete: "cascade" }),
    reportingYear: integer("reporting_year").notNull(),
    maxAmount: doublePrecision("max_amount").notNull(),
    amountUnit: varchar("amount_unit", { length: 32 }).notNull(),
    storageTypes: jsonb("storage_types").$type<string[]>().notNull().$defaultFn(() => []),
    safetyDataSheetId: uuid("safety_data_sheet_id").references(() => safetyDataSheetRef.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("facility_chemical_inventory_uniq").on(
      t.establishmentId,
      t.regulatoryChemicalId,
      t.reportingYear,
    ),
  ],
);

/** SDS Section 2–style hazard class+category for EPCRA/HCS programme inventory (not filing). */
export const chemicalHazardClassification = pgTable(
  "chemical_hazard_classification",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    regulatoryChemicalId: uuid("regulatory_chemical_id").references(() => regulatoryChemical.id, {
      onDelete: "cascade",
    }),
    safetyDataSheetId: uuid("safety_data_sheet_id").references(() => safetyDataSheetRef.id, {
      onDelete: "set null",
    }),
    hazardDomain: varchar("hazard_domain", { length: 16 }).notNull(),
    hazardClass: varchar("hazard_class", { length: 256 }).notNull(),
    hazardCategory: varchar("hazard_category", { length: 128 }).notNull(),
    source: varchar("source", { length: 32 }).notNull().default("manual"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("chemical_hazard_classification_org_chem_idx").on(
      t.organizationId,
      t.regulatoryChemicalId,
    ),
  ],
);

export const correctiveActionStatusEnum = pgEnum("corrective_action_status", [
  "pending_approval",
  "planned",
  "in_progress",
  "completed",
  "verified",
]);

export const correctiveAction = pgTable("corrective_action", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  incidentId: uuid("incident_id").references(() => incident.id, { onDelete: "set null" }),
  environmentalAspectId: uuid("environmental_aspect_id"),
  complianceObligationId: uuid("compliance_obligation_id"),
  environmentalRegulatoryPermitId: uuid("environmental_regulatory_permit_id").references(
    () => environmentalRegulatoryPermit.id,
    { onDelete: "set null" },
  ),
  managementReviewId: uuid("management_review_id"),
  title: varchar("title", { length: 512 }).notNull(),
  details: text("details"),
  /** Evidence / narrative recorded when status moves to verified (effectiveness review). */
  verificationNotes: text("verification_notes"),
  status: correctiveActionStatusEnum("status").notNull().default("planned"),
  dueDate: timestamp("due_date", { withTimezone: true, mode: "date" }),
  ownerUserId: text("owner_user_id").references(() => authUser.id, {
    onDelete: "set null",
  }),
  /** User who recorded verification / effectiveness (separation of duties vs owner). */
  verificationPerformedByUserId: text("verification_performed_by_user_id").references(
    () => authUser.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const incidentRelations = relations(incident, ({ one, many }) => ({
  organization: one(organization, {
    fields: [incident.organizationId],
    references: [organization.id],
  }),
  site: one(site, { fields: [incident.siteId], references: [site.id] }),
  reportedBy: one(authUser, {
    fields: [incident.reportedByUserId],
    references: [authUser.id],
  }),
  investigationOwner: one(authUser, {
    fields: [incident.investigationOwnerUserId],
    references: [authUser.id],
  }),
  externalParty: one(externalParty, {
    fields: [incident.externalPartyId],
    references: [externalParty.id],
  }),
  correctiveActions: many(correctiveAction),
  workRelatedInjuryIllnessRecord: one(workRelatedInjuryIllnessRecord, {
    fields: [incident.id],
    references: [workRelatedInjuryIllnessRecord.incidentId],
  }),
}));

export const workRelatedInjuryIllnessRecordRelations = relations(
  workRelatedInjuryIllnessRecord,
  ({ one }) => ({
    organization: one(organization, {
      fields: [workRelatedInjuryIllnessRecord.organizationId],
      references: [organization.id],
    }),
    incident: one(incident, {
      fields: [workRelatedInjuryIllnessRecord.incidentId],
      references: [incident.id],
    }),
    establishment: one(establishment, {
      fields: [workRelatedInjuryIllnessRecord.establishmentId],
      references: [establishment.id],
    }),
    injuredPersonSubject: one(personSubject, {
      fields: [workRelatedInjuryIllnessRecord.injuredPersonSubjectId],
      references: [personSubject.id],
    }),
    determinedBy: one(authUser, {
      fields: [workRelatedInjuryIllnessRecord.determinedByUserId],
      references: [authUser.id],
    }),
  }),
);

export const personSubjectRelations = relations(personSubject, ({ one }) => ({
  organization: one(organization, {
    fields: [personSubject.organizationId],
    references: [organization.id],
  }),
}));

export const establishmentRelations = relations(establishment, ({ one, many }) => ({
  organization: one(organization, {
    fields: [establishment.organizationId],
    references: [organization.id],
  }),
  site: one(site, {
    fields: [establishment.siteId],
    references: [site.id],
  }),
  yearMetrics: many(establishmentYearMetrics),
  monthMetrics: many(establishmentMonthMetrics),
}));

export const establishmentYearMetricsRelations = relations(establishmentYearMetrics, ({ one }) => ({
  establishment: one(establishment, {
    fields: [establishmentYearMetrics.establishmentId],
    references: [establishment.id],
  }),
}));

export const establishmentMonthMetricsRelations = relations(establishmentMonthMetrics, ({ one }) => ({
  establishment: one(establishment, {
    fields: [establishmentMonthMetrics.establishmentId],
    references: [establishment.id],
  }),
}));

export const dataRetentionPolicyRelations = relations(dataRetentionPolicy, ({ one }) => ({
  organization: one(organization, {
    fields: [dataRetentionPolicy.organizationId],
    references: [organization.id],
  }),
}));

export const regulatoryChemicalRelations = relations(regulatoryChemical, ({ one, many }) => ({
  organization: one(organization, {
    fields: [regulatoryChemical.organizationId],
    references: [organization.id],
  }),
  safetyDataSheets: many(safetyDataSheetRef),
  facilityInventories: many(facilityChemicalInventory),
  hazardClassifications: many(chemicalHazardClassification),
}));

export const safetyDataSheetRefRelations = relations(safetyDataSheetRef, ({ one, many }) => ({
  organization: one(organization, {
    fields: [safetyDataSheetRef.organizationId],
    references: [organization.id],
  }),
  chemical: one(regulatoryChemical, {
    fields: [safetyDataSheetRef.regulatoryChemicalId],
    references: [regulatoryChemical.id],
  }),
  hazardClassifications: many(chemicalHazardClassification),
}));

export const facilityChemicalInventoryRelations = relations(
  facilityChemicalInventory,
  ({ one }) => ({
    organization: one(organization, {
      fields: [facilityChemicalInventory.organizationId],
      references: [organization.id],
    }),
    establishment: one(establishment, {
      fields: [facilityChemicalInventory.establishmentId],
      references: [establishment.id],
    }),
    regulatoryChemical: one(regulatoryChemical, {
      fields: [facilityChemicalInventory.regulatoryChemicalId],
      references: [regulatoryChemical.id],
    }),
    safetyDataSheet: one(safetyDataSheetRef, {
      fields: [facilityChemicalInventory.safetyDataSheetId],
      references: [safetyDataSheetRef.id],
    }),
  }),
);

export const chemicalHazardClassificationRelations = relations(
  chemicalHazardClassification,
  ({ one }) => ({
    organization: one(organization, {
      fields: [chemicalHazardClassification.organizationId],
      references: [organization.id],
    }),
    chemical: one(regulatoryChemical, {
      fields: [chemicalHazardClassification.regulatoryChemicalId],
      references: [regulatoryChemical.id],
    }),
    safetyDataSheet: one(safetyDataSheetRef, {
      fields: [chemicalHazardClassification.safetyDataSheetId],
      references: [safetyDataSheetRef.id],
    }),
  }),
);

/* ——— Heat NEP program aid (CPL 03-00-024 Appendix I — not a federal heat standard) ——— */
export const heatProgramCheckStatusEnum = pgEnum("heat_program_check_status", [
  "not_started",
  "in_place",
  "partial",
  "gap",
  "not_applicable",
]);

export const heatIllnessPreventionProgram = pgTable(
  "heat_illness_prevention_program",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
    title: varchar("title", { length: 512 }).notNull().default("Heat illness prevention program"),
    writtenPlanUri: varchar("written_plan_uri", { length: 2048 }),
    notes: text("notes"),
    coversOutdoor: boolean("covers_outdoor").notNull().default(true),
    coversIndoor: boolean("covers_indoor").notNull().default(false),
    naicsNote: varchar("naics_note", { length: 128 }),
    checklistVersion: varchar("checklist_version", { length: 64 })
      .notNull()
      .default("2026-04-cpl-03-00-024"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("heat_illness_prevention_program_org_site_uniq").on(t.organizationId, t.siteId),
  ],
);

export const heatProgramControlCheck = pgTable(
  "heat_program_control_check",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    programId: uuid("program_id")
      .notNull()
      .references(() => heatIllnessPreventionProgram.id, { onDelete: "cascade" }),
    checkKey: varchar("check_key", { length: 64 }).notNull(),
    status: heatProgramCheckStatusEnum("status").notNull().default("not_started"),
    evidenceNotes: text("evidence_notes"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("heat_program_control_check_program_key_uniq").on(t.programId, t.checkKey),
    index("heat_program_control_check_org_idx").on(t.organizationId),
  ],
);

export const heatConditionLog = pgTable(
  "heat_condition_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    programId: uuid("program_id").references(() => heatIllnessPreventionProgram.id, {
      onDelete: "set null",
    }),
    siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
    observedAt: timestamp("observed_at", { withTimezone: true, mode: "date" }).notNull(),
    heatIndexF: doublePrecision("heat_index_f"),
    wbgtF: doublePrecision("wbgt_f"),
    source: varchar("source", { length: 128 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("heat_condition_log_org_observed_idx").on(t.organizationId, t.observedAt)],
);

export const heatIllnessPreventionProgramRelations = relations(
  heatIllnessPreventionProgram,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [heatIllnessPreventionProgram.organizationId],
      references: [organization.id],
    }),
    site: one(site, {
      fields: [heatIllnessPreventionProgram.siteId],
      references: [site.id],
    }),
    checks: many(heatProgramControlCheck),
    conditionLogs: many(heatConditionLog),
  }),
);

export const heatProgramControlCheckRelations = relations(heatProgramControlCheck, ({ one }) => ({
  organization: one(organization, {
    fields: [heatProgramControlCheck.organizationId],
    references: [organization.id],
  }),
  program: one(heatIllnessPreventionProgram, {
    fields: [heatProgramControlCheck.programId],
    references: [heatIllnessPreventionProgram.id],
  }),
}));

export const heatConditionLogRelations = relations(heatConditionLog, ({ one }) => ({
  organization: one(organization, {
    fields: [heatConditionLog.organizationId],
    references: [organization.id],
  }),
  program: one(heatIllnessPreventionProgram, {
    fields: [heatConditionLog.programId],
    references: [heatIllnessPreventionProgram.id],
  }),
  site: one(site, {
    fields: [heatConditionLog.siteId],
    references: [site.id],
  }),
}));

/* ——— ISO emergency preparedness (14001/45001 §8.2) ——— */
export const emergencyScenario = pgTable("emergency_scenario", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  name: varchar("name", { length: 512 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const emergencyPrepAsset = pgTable("emergency_prep_asset", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  scenarioId: uuid("scenario_id").references(() => emergencyScenario.id, {
    onDelete: "set null",
  }),
  equipmentName: varchar("equipment_name", { length: 512 }).notNull(),
  locationNote: text("location_note"),
  lastInspectedAt: timestamp("last_inspected_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const emergencyDrill = pgTable("emergency_drill", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  scenarioId: uuid("scenario_id")
    .notNull()
    .references(() => emergencyScenario.id, { onDelete: "cascade" }),
  drillDate: timestamp("drill_date", { withTimezone: true, mode: "date" }).notNull(),
  outcomeSummary: text("outcome_summary"),
  attendeesNote: text("attendees_note"),
  relatedIncidentId: uuid("related_incident_id").references(() => incident.id, {
    onDelete: "set null",
  }),
  relatedCorrectiveActionId: uuid("related_corrective_action_id").references(
    () => correctiveAction.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const emergencyScenarioRelations = relations(emergencyScenario, ({ one, many }) => ({
  organization: one(organization, {
    fields: [emergencyScenario.organizationId],
    references: [organization.id],
  }),
  site: one(site, {
    fields: [emergencyScenario.siteId],
    references: [site.id],
  }),
  assets: many(emergencyPrepAsset),
  drills: many(emergencyDrill),
}));

export const emergencyPrepAssetRelations = relations(emergencyPrepAsset, ({ one }) => ({
  organization: one(organization, {
    fields: [emergencyPrepAsset.organizationId],
    references: [organization.id],
  }),
  scenario: one(emergencyScenario, {
    fields: [emergencyPrepAsset.scenarioId],
    references: [emergencyScenario.id],
  }),
  site: one(site, {
    fields: [emergencyPrepAsset.siteId],
    references: [site.id],
  }),
}));

export const emergencyDrillRelations = relations(emergencyDrill, ({ one }) => ({
  organization: one(organization, {
    fields: [emergencyDrill.organizationId],
    references: [organization.id],
  }),
  scenario: one(emergencyScenario, {
    fields: [emergencyDrill.scenarioId],
    references: [emergencyScenario.id],
  }),
  relatedIncident: one(incident, {
    fields: [emergencyDrill.relatedIncidentId],
    references: [incident.id],
  }),
  relatedCorrectiveAction: one(correctiveAction, {
    fields: [emergencyDrill.relatedCorrectiveActionId],
    references: [correctiveAction.id],
  }),
}));

/* ——— ISO 14001 ——— */
export const aspectSignificanceEnum = pgEnum("aspect_significance", [
  "low",
  "medium",
  "high",
]);

export const aspectLifecycleEnum = pgEnum("aspect_lifecycle", [
  "raw_material",
  "operations",
  "transport",
  "disposal",
  "other",
]);

export const environmentalAspect = pgTable("environmental_aspect", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  managementSystemScopeId: uuid("management_system_scope_id").references(
    () => managementSystemScope.id,
    { onDelete: "set null" },
  ),
  contextIssueId: uuid("context_issue_id").references(() => contextIssue.id, {
    onDelete: "set null",
  }),
  interestedPartyId: uuid("interested_party_id").references(() => interestedParty.id, {
    onDelete: "set null",
  }),
  /** ISO 14001: activity associated with the aspect */
  activity: varchar("activity", { length: 512 }),
  name: varchar("name", { length: 512 }).notNull(),
  description: text("description"),
  /** Environmental impact(s) — links aspect to “impacts” */
  environmentalImpact: text("environmental_impact"),
  lifecycleStage: aspectLifecycleEnum("lifecycle_stage"),
  /** Free-text life-cycle perspective note (ISO 14001:2026 programme aid). */
  lifecyclePerspectiveNote: text("lifecycle_perspective_note"),
  /** Explicit climate / biodiversity relevance flags (ISO 14001:2026 programme aid). */
  climateRelevant: boolean("climate_relevant").notNull().default(false),
  biodiversityRelevant: boolean("biodiversity_relevant").notNull().default(false),
  /** Multi-criteria scores e.g. legal, severity, likelihood, stakeholder — 1–5 */
  significanceCriteria: jsonb("significance_criteria").$type<Record<string, number>>(),
  significance: aspectSignificanceEnum("significance").notNull().default("medium"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const environmentalImpact = pgTable("environmental_impact", {
  id: uuid("id").defaultRandom().primaryKey(),
  aspectId: uuid("aspect_id")
    .notNull()
    .references(() => environmentalAspect.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const complianceObligation = pgTable("compliance_obligation", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  managementSystemScopeId: uuid("management_system_scope_id").references(
    () => managementSystemScope.id,
    { onDelete: "set null" },
  ),
  contextIssueId: uuid("context_issue_id").references(() => contextIssue.id, {
    onDelete: "set null",
  }),
  interestedPartyId: uuid("interested_party_id").references(() => interestedParty.id, {
    onDelete: "set null",
  }),
  title: varchar("title", { length: 512 }).notNull(),
  requirementType: varchar("requirement_type", { length: 128 }).notNull(),
  referenceCode: varchar("reference_code", { length: 256 }),
  jurisdiction: varchar("jurisdiction", { length: 256 }),
  applicabilityNotes: text("applicability_notes"),
  ownerUserId: text("owner_user_id").references(() => authUser.id, { onDelete: "set null" }),
  /** Explicit site applicability; empty = org-wide */
  applicableSiteIds: jsonb("applicable_site_ids").$type<string[]>().notNull().$defaultFn(() => []),
  nextReviewDue: timestamp("next_review_due", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const obligationAspectLink = pgTable(
  "obligation_aspect_link",
  {
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => complianceObligation.id, { onDelete: "cascade" }),
    aspectId: uuid("aspect_id")
      .notNull()
      .references(() => environmentalAspect.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.obligationId, t.aspectId] })],
);

export const environmentalRegulatoryPermitMediaEnum = pgEnum(
  "environmental_regulatory_permit_media",
  ["air", "water", "waste", "general"],
);

export const environmentalRegulatoryPermitStatusEnum = pgEnum(
  "environmental_regulatory_permit_status",
  ["draft", "pending_approval", "active", "suspended", "expired", "closed"],
);

/** Air / water / waste (etc.) **regulatory** permit register — program record; not claimed as agency filing. */
export const environmentalRegulatoryPermit = pgTable(
  "environmental_regulatory_permit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
    title: varchar("title", { length: 512 }).notNull(),
    permitIdentifier: varchar("permit_identifier", { length: 256 }).notNull(),
    agency: varchar("agency", { length: 256 }),
    jurisdiction: varchar("jurisdiction", { length: 256 }),
    media: environmentalRegulatoryPermitMediaEnum("media").notNull().default("general"),
    status: environmentalRegulatoryPermitStatusEnum("status").notNull().default("draft"),
    issuedAt: timestamp("issued_at", { withTimezone: true, mode: "date" }),
    effectiveFrom: timestamp("effective_from", { withTimezone: true, mode: "date" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    legalCitations: text("legal_citations"),
    /** Structured limits / parameters — validate at API layer (Zod). */
    limits: jsonb("limits").$type<Record<string, unknown>>(),
    complianceObligationId: uuid("compliance_obligation_id").references(
      () => complianceObligation.id,
      { onDelete: "set null" },
    ),
    ownerUserId: text("owner_user_id").references(() => authUser.id, { onDelete: "set null" }),
    /** When past, processed by retention cron (`environmental_regulatory_permit_program` policies). */
    retainUntil: timestamp("retain_until", { withTimezone: true, mode: "date" }),
    legalHold: boolean("legal_hold").notNull().default(false),
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("env_reg_permit_org_status_idx").on(t.organizationId, t.status),
    index("env_reg_permit_org_expires_idx").on(t.organizationId, t.expiresAt),
  ],
);

export const environmentalRegulatoryPermitCondition = pgTable(
  "environmental_regulatory_permit_condition",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    permitId: uuid("permit_id")
      .notNull()
      .references(() => environmentalRegulatoryPermit.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    conditionText: text("condition_text").notNull(),
    referenceCode: varchar("reference_code", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("env_reg_permit_condition_permit_idx").on(t.permitId)],
);

export const environmentalMonitoringResult = pgTable("environmental_monitoring_result", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  environmentalAspectId: uuid("environmental_aspect_id").references(
    () => environmentalAspect.id,
    { onDelete: "set null" },
  ),
  complianceObligationId: uuid("compliance_obligation_id").references(
    () => complianceObligation.id,
    { onDelete: "set null" },
  ),
  environmentalRegulatoryPermitId: uuid("environmental_regulatory_permit_id").references(
    () => environmentalRegulatoryPermit.id,
    { onDelete: "set null" },
  ),
  parameterName: varchar("parameter_name", { length: 256 }).notNull(),
  measuredAt: timestamp("measured_at", { withTimezone: true, mode: "date" }).notNull(),
  valueText: varchar("value_text", { length: 256 }).notNull(),
  unit: varchar("unit", { length: 64 }),
  legalLimitText: varchar("legal_limit_text", { length: 256 }),
  methodNote: text("method_note"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const obligationReview = pgTable("obligation_review", {
  id: uuid("id").defaultRandom().primaryKey(),
  obligationId: uuid("obligation_id")
    .notNull()
    .references(() => complianceObligation.id, { onDelete: "cascade" }),
  dueAt: timestamp("due_at", { withTimezone: true, mode: "date" }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  outcomeSummary: text("outcome_summary"),
  nextReviewDue: timestamp("next_review_due", { withTimezone: true, mode: "date" }),
  reviewerUserId: text("reviewer_user_id").references(() => authUser.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const obligationReviewRelations = relations(obligationReview, ({ one }) => ({
  obligation: one(complianceObligation, {
    fields: [obligationReview.obligationId],
    references: [complianceObligation.id],
  }),
  reviewer: one(authUser, {
    fields: [obligationReview.reviewerUserId],
    references: [authUser.id],
  }),
}));

export const environmentalAspectRelations = relations(
  environmentalAspect,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [environmentalAspect.organizationId],
      references: [organization.id],
    }),
    site: one(site, {
      fields: [environmentalAspect.siteId],
      references: [site.id],
    }),
    managementSystemScope: one(managementSystemScope, {
      fields: [environmentalAspect.managementSystemScopeId],
      references: [managementSystemScope.id],
    }),
    contextIssue: one(contextIssue, {
      fields: [environmentalAspect.contextIssueId],
      references: [contextIssue.id],
    }),
    interestedParty: one(interestedParty, {
      fields: [environmentalAspect.interestedPartyId],
      references: [interestedParty.id],
    }),
    impacts: many(environmentalImpact),
    monitoringResults: many(environmentalMonitoringResult),
    obligationLinks: many(obligationAspectLink),
  }),
);

export const environmentalImpactRelations = relations(environmentalImpact, ({ one }) => ({
  aspect: one(environmentalAspect, {
    fields: [environmentalImpact.aspectId],
    references: [environmentalAspect.id],
  }),
}));

export const environmentalMonitoringResultRelations = relations(
  environmentalMonitoringResult,
  ({ one }) => ({
    organization: one(organization, {
      fields: [environmentalMonitoringResult.organizationId],
      references: [organization.id],
    }),
    site: one(site, {
      fields: [environmentalMonitoringResult.siteId],
      references: [site.id],
    }),
    environmentalAspect: one(environmentalAspect, {
      fields: [environmentalMonitoringResult.environmentalAspectId],
      references: [environmentalAspect.id],
    }),
    complianceObligation: one(complianceObligation, {
      fields: [environmentalMonitoringResult.complianceObligationId],
      references: [complianceObligation.id],
    }),
    regulatoryPermit: one(environmentalRegulatoryPermit, {
      fields: [environmentalMonitoringResult.environmentalRegulatoryPermitId],
      references: [environmentalRegulatoryPermit.id],
    }),
  }),
);

export const environmentalRegulatoryPermitRelations = relations(
  environmentalRegulatoryPermit,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [environmentalRegulatoryPermit.organizationId],
      references: [organization.id],
    }),
    site: one(site, {
      fields: [environmentalRegulatoryPermit.siteId],
      references: [site.id],
    }),
    complianceObligation: one(complianceObligation, {
      fields: [environmentalRegulatoryPermit.complianceObligationId],
      references: [complianceObligation.id],
    }),
    owner: one(authUser, {
      fields: [environmentalRegulatoryPermit.ownerUserId],
      references: [authUser.id],
    }),
    conditions: many(environmentalRegulatoryPermitCondition),
    monitoringResults: many(environmentalMonitoringResult),
    correctiveActions: many(correctiveAction),
  }),
);

export const environmentalRegulatoryPermitConditionRelations = relations(
  environmentalRegulatoryPermitCondition,
  ({ one }) => ({
    permit: one(environmentalRegulatoryPermit, {
      fields: [environmentalRegulatoryPermitCondition.permitId],
      references: [environmentalRegulatoryPermit.id],
    }),
  }),
);

export const obligationAspectLinkRelations = relations(obligationAspectLink, ({ one }) => ({
  obligation: one(complianceObligation, {
    fields: [obligationAspectLink.obligationId],
    references: [complianceObligation.id],
  }),
  aspect: one(environmentalAspect, {
    fields: [obligationAspectLink.aspectId],
    references: [environmentalAspect.id],
  }),
}));

/* ——— Shared documented information ——— */
export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "approved",
  "obsolete",
  "obsolete_retained",
]);

export const controlledDocument = pgTable("controlled_document", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 512 }).notNull(),
  documentNumber: varchar("document_number", { length: 128 }).notNull(),
  revision: varchar("revision", { length: 32 }).notNull().default("1.0"),
  effectiveDate: timestamp("effective_date", { withTimezone: true, mode: "date" }),
  status: documentStatusEnum("status").notNull().default("draft"),
  approvedByUserId: text("approved_by_user_id").references(() => authUser.id, {
    onDelete: "set null",
  }),
  approvedAt: timestamp("approved_at", { withTimezone: true, mode: "date" }),
  evidenceUrl: varchar("evidence_url", { length: 2048 }),
  retentionNote: text("retention_note"),
  legalHold: boolean("legal_hold").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const documentRevision = pgTable("document_revision", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => controlledDocument.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  revision: varchar("revision", { length: 32 }).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  summary: text("summary"),
  status: documentStatusEnum("status").notNull().default("draft"),
  effectiveDate: timestamp("effective_date", { withTimezone: true, mode: "date" }),
  approvedByUserId: text("approved_by_user_id").references(() => authUser.id, {
    onDelete: "set null",
  }),
  approvedAt: timestamp("approved_at", { withTimezone: true, mode: "date" }),
  isCurrent: boolean("is_current").notNull().default(false),
  evidenceUrl: varchar("evidence_url", { length: 2048 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const documentDistribution = pgTable("document_distribution", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentRevisionId: uuid("document_revision_id")
    .notNull()
    .references(() => documentRevision.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => authUser.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").references(() => role.id, { onDelete: "cascade" }),
  issuedAt: timestamp("issued_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const documentRevisionRelations = relations(documentRevision, ({ one, many }) => ({
  document: one(controlledDocument, {
    fields: [documentRevision.documentId],
    references: [controlledDocument.id],
  }),
  organization: one(organization, {
    fields: [documentRevision.organizationId],
    references: [organization.id],
  }),
  distributions: many(documentDistribution),
}));

export const documentDistributionRelations = relations(documentDistribution, ({ one }) => ({
  revision: one(documentRevision, {
    fields: [documentDistribution.documentRevisionId],
    references: [documentRevision.id],
  }),
  site: one(site, {
    fields: [documentDistribution.siteId],
    references: [site.id],
  }),
  user: one(authUser, {
    fields: [documentDistribution.userId],
    references: [authUser.id],
  }),
  role: one(role, {
    fields: [documentDistribution.roleId],
    references: [role.id],
  }),
}));

export const managementReview = pgTable("management_review", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  reviewDate: timestamp("review_date", { withTimezone: true, mode: "date" }).notNull(),
  summary: text("summary").notNull(),
  /** Outputs / decisions / need for changes (documented information) */
  actionItems: text("action_items"),
  nextReviewDue: timestamp("next_review_due", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

/* ——— ISO 45001 planning: hazards, risk, objectives, operational controls ——— */
export const hazard = pgTable("hazard", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  managementSystemScopeId: uuid("management_system_scope_id").references(
    () => managementSystemScope.id,
    { onDelete: "set null" },
  ),
  contextIssueId: uuid("context_issue_id").references(() => contextIssue.id, {
    onDelete: "set null",
  }),
  interestedPartyId: uuid("interested_party_id").references(() => interestedParty.id, {
    onDelete: "set null",
  }),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const riskRatingEnum = pgEnum("risk_rating", [
  "low",
  "medium",
  "high",
  "very_high",
]);

export const riskAssessmentKindEnum = pgEnum("risk_assessment_kind", [
  "general",
  "task_based",
  "site_based",
]);

export const riskAssessmentStatusEnum = pgEnum("risk_assessment_status", [
  "draft",
  "active",
  "under_review",
  "archived",
]);

export const riskAssessment = pgTable("risk_assessment", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  hazardId: uuid("hazard_id").references(() => hazard.id, { onDelete: "set null" }),
  /** Roster label (optional; legacy rows may use hazard title only). */
  summaryTitle: varchar("summary_title", { length: 512 }),
  assessmentKind: riskAssessmentKindEnum("assessment_kind").notNull().default("general"),
  status: riskAssessmentStatusEnum("status").notNull().default("active"),
  reviewDueAt: timestamp("review_due_at", { withTimezone: true, mode: "date" }),
  context: text("context").notNull(),
  existingControls: text("existing_controls"),
  inherentRating: riskRatingEnum("inherent_rating"),
  likelihoodScore: integer("likelihood_score"),
  consequenceScore: integer("consequence_score"),
  residualRating: riskRatingEnum("residual_rating").notNull().default("medium"),
  assessedByUserId: text("assessed_by_user_id").references(() => authUser.id, {
    onDelete: "set null",
  }),
  assessedAt: timestamp("assessed_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  retainUntil: timestamp("retain_until", { withTimezone: true, mode: "date" }),
  legalHold: boolean("legal_hold").notNull().default(false),
  anonymizedAt: timestamp("anonymized_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
},
(t) => [
  index("risk_assessment_org_kind_status_idx").on(t.organizationId, t.assessmentKind, t.status),
  index("risk_assessment_org_site_idx").on(t.organizationId, t.siteId),
]);

export const riskAssessmentStep = pgTable(
  "risk_assessment_step",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    riskAssessmentId: uuid("risk_assessment_id")
      .notNull()
      .references(() => riskAssessment.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    taskDescription: text("task_description").notNull(),
    hazardText: text("hazard_text").notNull(),
    controlsText: text("controls_text"),
    inherentRating: riskRatingEnum("inherent_rating"),
    residualRating: riskRatingEnum("residual_rating"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("risk_assessment_step_parent_idx").on(t.riskAssessmentId)],
);

export const objectiveTypeEnum = pgEnum("objective_type", [
  "oh_safety",
  "environmental",
]);

export const objectiveStatusEnum = pgEnum("objective_status", [
  "active",
  "achieved",
  "cancelled",
]);

export const managementObjective = pgTable("management_objective", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  type: objectiveTypeEnum("type").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  targetMetrics: text("target_metrics"),
  dueDate: timestamp("due_date", { withTimezone: true, mode: "date" }),
  status: objectiveStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const objectiveKpiMeasurement = pgTable("objective_kpi_measurement", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  managementObjectiveId: uuid("management_objective_id")
    .notNull()
    .references(() => managementObjective.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start", { withTimezone: true, mode: "date" }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true, mode: "date" }).notNull(),
  actualValue: varchar("actual_value", { length: 256 }).notNull(),
  targetValue: varchar("target_value", { length: 256 }),
  unit: varchar("unit", { length: 64 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const consultationRecord = pgTable("consultation_record", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  topic: varchar("topic", { length: 512 }).notNull(),
  consultedAt: timestamp("consulted_at", { withTimezone: true, mode: "date" }).notNull(),
  outcomeSummary: text("outcome_summary"),
  relatedIncidentId: uuid("related_incident_id").references(() => incident.id, {
    onDelete: "set null",
  }),
  relatedObjectiveId: uuid("related_objective_id").references(() => managementObjective.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const operationalControl = pgTable("operational_control", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  environmentalAspectId: uuid("environmental_aspect_id").references(
    () => environmentalAspect.id,
    { onDelete: "set null" },
  ),
  hazardId: uuid("hazard_id").references(() => hazard.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const obligationOperationalControlLink = pgTable(
  "obligation_operational_control_link",
  {
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => complianceObligation.id, { onDelete: "cascade" }),
    operationalControlId: uuid("operational_control_id")
      .notNull()
      .references(() => operationalControl.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.obligationId, t.operationalControlId] })],
);

export const hazardRelations = relations(hazard, ({ one, many }) => ({
  organization: one(organization, {
    fields: [hazard.organizationId],
    references: [organization.id],
  }),
  site: one(site, { fields: [hazard.siteId], references: [site.id] }),
  managementSystemScope: one(managementSystemScope, {
    fields: [hazard.managementSystemScopeId],
    references: [managementSystemScope.id],
  }),
  contextIssue: one(contextIssue, {
    fields: [hazard.contextIssueId],
    references: [contextIssue.id],
  }),
  interestedParty: one(interestedParty, {
    fields: [hazard.interestedPartyId],
    references: [interestedParty.id],
  }),
  riskAssessments: many(riskAssessment),
  operationalControls: many(operationalControl),
}));

export const riskAssessmentRelations = relations(riskAssessment, ({ one, many }) => ({
  organization: one(organization, {
    fields: [riskAssessment.organizationId],
    references: [organization.id],
  }),
  site: one(site, {
    fields: [riskAssessment.siteId],
    references: [site.id],
  }),
  hazard: one(hazard, {
    fields: [riskAssessment.hazardId],
    references: [hazard.id],
  }),
  assessedBy: one(authUser, {
    fields: [riskAssessment.assessedByUserId],
    references: [authUser.id],
  }),
  steps: many(riskAssessmentStep),
}));

export const riskAssessmentStepRelations = relations(riskAssessmentStep, ({ one }) => ({
  assessment: one(riskAssessment, {
    fields: [riskAssessmentStep.riskAssessmentId],
    references: [riskAssessment.id],
  }),
}));

export const managementObjectiveRelations = relations(
  managementObjective,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [managementObjective.organizationId],
      references: [organization.id],
    }),
    kpiMeasurements: many(objectiveKpiMeasurement),
  }),
);

export const objectiveKpiMeasurementRelations = relations(
  objectiveKpiMeasurement,
  ({ one }) => ({
    organization: one(organization, {
      fields: [objectiveKpiMeasurement.organizationId],
      references: [organization.id],
    }),
    objective: one(managementObjective, {
      fields: [objectiveKpiMeasurement.managementObjectiveId],
      references: [managementObjective.id],
    }),
  }),
);

export const consultationRecordRelations = relations(consultationRecord, ({ one }) => ({
  organization: one(organization, {
    fields: [consultationRecord.organizationId],
    references: [organization.id],
  }),
  relatedIncident: one(incident, {
    fields: [consultationRecord.relatedIncidentId],
    references: [incident.id],
  }),
  relatedObjective: one(managementObjective, {
    fields: [consultationRecord.relatedObjectiveId],
    references: [managementObjective.id],
  }),
}));

export const operationalControlRelations = relations(
  operationalControl,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [operationalControl.organizationId],
      references: [organization.id],
    }),
    environmentalAspect: one(environmentalAspect, {
      fields: [operationalControl.environmentalAspectId],
      references: [environmentalAspect.id],
    }),
    hazard: one(hazard, {
      fields: [operationalControl.hazardId],
      references: [hazard.id],
    }),
    obligationLinks: many(obligationOperationalControlLink),
  }),
);

export const obligationOperationalControlLinkRelations = relations(
  obligationOperationalControlLink,
  ({ one }) => ({
    obligation: one(complianceObligation, {
      fields: [obligationOperationalControlLink.obligationId],
      references: [complianceObligation.id],
    }),
    operationalControl: one(operationalControl, {
      fields: [obligationOperationalControlLink.operationalControlId],
      references: [operationalControl.id],
    }),
  }),
);

export const complianceObligationRelations = relations(
  complianceObligation,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [complianceObligation.organizationId],
      references: [organization.id],
    }),
    managementSystemScope: one(managementSystemScope, {
      fields: [complianceObligation.managementSystemScopeId],
      references: [managementSystemScope.id],
    }),
    contextIssue: one(contextIssue, {
      fields: [complianceObligation.contextIssueId],
      references: [contextIssue.id],
    }),
    interestedParty: one(interestedParty, {
      fields: [complianceObligation.interestedPartyId],
      references: [interestedParty.id],
    }),
    owner: one(authUser, {
      fields: [complianceObligation.ownerUserId],
      references: [authUser.id],
    }),
    reviews: many(obligationReview),
    aspectLinks: many(obligationAspectLink),
    operationalControlLinks: many(obligationOperationalControlLink),
    monitoringResults: many(environmentalMonitoringResult),
  }),
);

/* ——— Competence & internal audit ——— */
export const trainingRecord = pgTable("training_record", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  traineeName: varchar("trainee_name", { length: 256 }).notNull(),
  userId: text("user_id").references(() => authUser.id, { onDelete: "set null" }),
  courseTitle: varchar("course_title", { length: 512 }).notNull(),
  completedOn: timestamp("completed_on", { withTimezone: true, mode: "date" }),
  expiresOn: timestamp("expires_on", { withTimezone: true, mode: "date" }),
  evidenceNote: text("evidence_note"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const internalAuditStatusEnum = pgEnum("internal_audit_status", [
  "planned",
  "in_progress",
  "completed",
]);

export const internalAudit = pgTable("internal_audit", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 512 }).notNull(),
  scope: text("scope").notNull(),
  status: internalAuditStatusEnum("status").notNull().default("planned"),
  plannedDate: timestamp("planned_date", { withTimezone: true, mode: "date" }),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  leadAuditorUserId: text("lead_auditor_user_id").references(() => authUser.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const auditFindingTypeEnum = pgEnum("audit_finding_type", [
  "observation",
  "minor_nc",
  "major_nc",
  "opportunity",
]);

export const auditFinding = pgTable("audit_finding", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  internalAuditId: uuid("internal_audit_id")
    .notNull()
    .references(() => internalAudit.id, { onDelete: "cascade" }),
  findingType: auditFindingTypeEnum("finding_type").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  details: text("details"),
  correctiveActionId: uuid("corrective_action_id").references(() => correctiveAction.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const trainingRecordRelations = relations(trainingRecord, ({ one }) => ({
  organization: one(organization, {
    fields: [trainingRecord.organizationId],
    references: [organization.id],
  }),
  user: one(authUser, {
    fields: [trainingRecord.userId],
    references: [authUser.id],
  }),
}));

export const internalAuditRelations = relations(internalAudit, ({ one, many }) => ({
  organization: one(organization, {
    fields: [internalAudit.organizationId],
    references: [organization.id],
  }),
  leadAuditor: one(authUser, {
    fields: [internalAudit.leadAuditorUserId],
    references: [authUser.id],
  }),
  findings: many(auditFinding),
}));

export const auditFindingRelations = relations(auditFinding, ({ one }) => ({
  organization: one(organization, {
    fields: [auditFinding.organizationId],
    references: [organization.id],
  }),
  internalAudit: one(internalAudit, {
    fields: [auditFinding.internalAuditId],
    references: [internalAudit.id],
  }),
  correctiveAction: one(correctiveAction, {
    fields: [auditFinding.correctiveActionId],
    references: [correctiveAction.id],
  }),
}));

/** Site / workplace inspections (routine, regulatory, pre-job, etc.) — ISO 45001 operational monitoring. */
export const inspectionStatusEnum = pgEnum("inspection_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

export const inspectionTypeEnum = pgEnum("inspection_type", [
  "routine",
  "regulatory",
  "pre_job",
  "other",
]);

export const inspection = pgTable(
  "inspection",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
    title: varchar("title", { length: 512 }).notNull(),
    inspectionType: inspectionTypeEnum("inspection_type").notNull().default("other"),
    status: inspectionStatusEnum("status").notNull().default("scheduled"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    leadUserId: text("lead_user_id").references(() => authUser.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("inspection_org_status_idx").on(t.organizationId, t.status),
    index("inspection_org_scheduled_idx").on(t.organizationId, t.scheduledAt),
  ],
);

export const inspectionRelations = relations(inspection, ({ one }) => ({
  organization: one(organization, {
    fields: [inspection.organizationId],
    references: [organization.id],
  }),
  site: one(site, {
    fields: [inspection.siteId],
    references: [site.id],
  }),
  lead: one(authUser, {
    fields: [inspection.leadUserId],
    references: [authUser.id],
  }),
}));

/** Permit to work — controlled hazardous work authorization (supports ISO operational control linkage). */
export const workPermitStatusEnum = pgEnum("work_permit_status", [
  "draft",
  "pending_approval",
  "active",
  "rejected",
  "completed",
  "cancelled",
  "expired",
]);

export const workPermitTypeEnum = pgEnum("work_permit_type", [
  "hot_work",
  "confined_space",
  "work_at_height",
  "other",
]);

export const workPermit = pgTable(
  "work_permit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
    title: varchar("title", { length: 512 }).notNull(),
    permitType: workPermitTypeEnum("permit_type").notNull().default("other"),
    status: workPermitStatusEnum("status").notNull().default("draft"),
    requesterUserId: text("requester_user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "restrict" }),
    validFrom: timestamp("valid_from", { withTimezone: true, mode: "date" }).notNull(),
    validTo: timestamp("valid_to", { withTimezone: true, mode: "date" }).notNull(),
    workSummary: text("work_summary").notNull(),
    hazardsControls: text("hazards_controls"),
    approvedByUserId: text("approved_by_user_id").references(() => authUser.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    cancelReason: text("cancel_reason"),
    /** When past, processed by retention cron (`data_retention_policy` for record class work_permit_program). */
    retainUntil: timestamp("retain_until", { withTimezone: true, mode: "date" }),
    legalHold: boolean("legal_hold").notNull().default(false),
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("work_permit_org_status_idx").on(t.organizationId, t.status),
    index("work_permit_org_valid_to_idx").on(t.organizationId, t.validTo),
  ],
);

export const workPermitRelations = relations(workPermit, ({ one }) => ({
  organization: one(organization, {
    fields: [workPermit.organizationId],
    references: [organization.id],
  }),
  site: one(site, {
    fields: [workPermit.siteId],
    references: [site.id],
  }),
  requester: one(authUser, {
    fields: [workPermit.requesterUserId],
    references: [authUser.id],
  }),
  approvedBy: one(authUser, {
    fields: [workPermit.approvedByUserId],
    references: [authUser.id],
  }),
}));

/** Field safety observations — leading indicators / BBS-style capture; not a substitute for regulatory incident logs. */
export const safetyObservationStatusEnum = pgEnum("safety_observation_status", [
  "open",
  "acknowledged",
  "closed",
]);

export const safetyObservationCategoryEnum = pgEnum("safety_observation_category", [
  "positive_behavior",
  "at_risk_behavior",
  "unsafe_condition",
  "other",
]);

export const safetyObservationSeverityEnum = pgEnum("safety_observation_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const safetyObservation = pgTable(
  "safety_observation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
    observedAt: timestamp("observed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    category: safetyObservationCategoryEnum("category").notNull().default("other"),
    severity: safetyObservationSeverityEnum("severity").notNull().default("medium"),
    summary: varchar("summary", { length: 512 }).notNull(),
    details: text("details"),
    status: safetyObservationStatusEnum("status").notNull().default("open"),
    reporterUserId: text("reporter_user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    linkedCorrectiveActionId: uuid("linked_corrective_action_id").references(
      () => correctiveAction.id,
      { onDelete: "set null" },
    ),
    /** Nullable: field follow-up owner (org member). */
    assigneeUserId: text("assignee_user_id").references(() => authUser.id, {
      onDelete: "set null",
    }),
    /** When set, overdue follow-up records `escalation_event` (entityType `safety_observation`) via cron. */
    followUpDueAt: timestamp("follow_up_due_at", { withTimezone: true, mode: "date" }),
    /** When past, processed by retention cron (`data_retention_policy` for record class safety_observation_program). */
    retainUntil: timestamp("retain_until", { withTimezone: true, mode: "date" }),
    legalHold: boolean("legal_hold").notNull().default(false),
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true, mode: "date" }),
  },
  (t) => [
    index("safety_observation_org_status_idx").on(t.organizationId, t.status),
    index("safety_observation_org_observed_idx").on(t.organizationId, t.observedAt),
    index("safety_observation_org_followup_due_partial_idx")
      .on(t.organizationId, t.followUpDueAt)
      .where(
        sql`${t.status} IN ('open', 'acknowledged') AND ${t.followUpDueAt} IS NOT NULL`,
      ),
  ],
);

export const safetyObservationRelations = relations(safetyObservation, ({ one }) => ({
  organization: one(organization, {
    fields: [safetyObservation.organizationId],
    references: [organization.id],
  }),
  site: one(site, {
    fields: [safetyObservation.siteId],
    references: [site.id],
  }),
  reporter: one(authUser, {
    fields: [safetyObservation.reporterUserId],
    references: [authUser.id],
  }),
  linkedCorrectiveAction: one(correctiveAction, {
    fields: [safetyObservation.linkedCorrectiveActionId],
    references: [correctiveAction.id],
  }),
  assignee: one(authUser, {
    fields: [safetyObservation.assigneeUserId],
    references: [authUser.id],
  }),
}));

/* ——— Leadership: policy & consultation ——— */
export const policyRevisionStatusEnum = pgEnum("policy_revision_status", [
  "draft",
  "pending_approval",
  "active",
  "superseded",
]);

export const policyStatement = pgTable("policy_statement", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 512 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const policyRevision = pgTable("policy_revision", {
  id: uuid("id").defaultRandom().primaryKey(),
  policyStatementId: uuid("policy_statement_id")
    .notNull()
    .references(() => policyStatement.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  versionLabel: varchar("version_label", { length: 64 }).notNull(),
  body: text("body").notNull(),
  summary: text("summary"),
  status: policyRevisionStatusEnum("status").notNull().default("draft"),
  effectiveAt: timestamp("effective_at", { withTimezone: true, mode: "date" }),
  approvedByUserId: text("approved_by_user_id").references(() => authUser.id, {
    onDelete: "set null",
  }),
  controlledDocumentId: uuid("controlled_document_id").references(() => controlledDocument.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const policyAcknowledgement = pgTable("policy_acknowledgement", {
  id: uuid("id").defaultRandom().primaryKey(),
  policyRevisionId: uuid("policy_revision_id")
    .notNull()
    .references(() => policyRevision.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  channel: varchar("channel", { length: 64 }),
});

export const workerConsultationRecord = pgTable("worker_consultation_record", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  consultationDate: timestamp("consultation_date", { withTimezone: true, mode: "date" }).notNull(),
  topic: varchar("topic", { length: 512 }).notNull(),
  ohSafety: boolean("oh_safety").notNull().default(true),
  environmental: boolean("environmental").notNull().default(false),
  participantsSummary: text("participants_summary"),
  minutesNote: text("minutes_note"),
  controlledDocumentId: uuid("controlled_document_id").references(() => controlledDocument.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const policyStatementRelations = relations(policyStatement, ({ one, many }) => ({
  organization: one(organization, {
    fields: [policyStatement.organizationId],
    references: [organization.id],
  }),
  revisions: many(policyRevision),
}));

export const policyRevisionRelations = relations(policyRevision, ({ one, many }) => ({
  policy: one(policyStatement, {
    fields: [policyRevision.policyStatementId],
    references: [policyStatement.id],
  }),
  organization: one(organization, {
    fields: [policyRevision.organizationId],
    references: [organization.id],
  }),
  linkedDocument: one(controlledDocument, {
    fields: [policyRevision.controlledDocumentId],
    references: [controlledDocument.id],
  }),
  acknowledgements: many(policyAcknowledgement),
}));

export const policyAcknowledgementRelations = relations(policyAcknowledgement, ({ one }) => ({
  revision: one(policyRevision, {
    fields: [policyAcknowledgement.policyRevisionId],
    references: [policyRevision.id],
  }),
  user: one(authUser, {
    fields: [policyAcknowledgement.userId],
    references: [authUser.id],
  }),
}));

export const workerConsultationRecordRelations = relations(
  workerConsultationRecord,
  ({ one }) => ({
    organization: one(organization, {
      fields: [workerConsultationRecord.organizationId],
      references: [organization.id],
    }),
    site: one(site, {
      fields: [workerConsultationRecord.siteId],
      references: [site.id],
    }),
    document: one(controlledDocument, {
      fields: [workerConsultationRecord.controlledDocumentId],
      references: [controlledDocument.id],
    }),
  }),
);

/* ——— Management of change ——— */
export const mocStatusEnum = pgEnum("moc_status", [
  "draft",
  "under_review",
  "approved",
  "implemented",
  "closed",
]);

/** ISO 14001:2026 Clause 6.3 change trigger (programme aid). */
export const mocChangeTriggerEnum = pgEnum("moc_change_trigger", [
  "process",
  "product",
  "obligation",
  "knowledge",
  "supplier",
  "organization",
  "disruption",
  "other",
]);

export const managementOfChange = pgTable("management_of_change", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description").notNull(),
  plannedDate: timestamp("planned_date", { withTimezone: true, mode: "date" }),
  status: mocStatusEnum("status").notNull().default("draft"),
  ohSafetyImpact: boolean("oh_safety_impact").notNull().default(false),
  environmentalImpactFlag: boolean("environmental_impact_flag").notNull().default(false),
  changeTrigger: mocChangeTriggerEnum("change_trigger"),
  aspectsReviewed: boolean("aspects_reviewed").notNull().default(false),
  obligationsReviewed: boolean("obligations_reviewed").notNull().default(false),
  controlsUpdated: boolean("controls_updated").notNull().default(false),
  postImplementationReviewDue: timestamp("post_implementation_review_due", {
    withTimezone: true,
    mode: "date",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const mocEntityLink = pgTable(
  "moc_entity_link",
  {
    mocId: uuid("moc_id")
      .notNull()
      .references(() => managementOfChange.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: uuid("entity_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.mocId, t.entityType, t.entityId] })],
);

export const managementOfChangeRelations = relations(
  managementOfChange,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [managementOfChange.organizationId],
      references: [organization.id],
    }),
    site: one(site, {
      fields: [managementOfChange.siteId],
      references: [site.id],
    }),
    links: many(mocEntityLink),
  }),
);

export const mocEntityLinkRelations = relations(mocEntityLink, ({ one }) => ({
  moc: one(managementOfChange, {
    fields: [mocEntityLink.mocId],
    references: [managementOfChange.id],
  }),
}));

/* ——— External audit & certification (not internal audit) ——— */
export const certificationBodyAudit = pgTable("certification_body_audit", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  certificationBodyName: varchar("certification_body_name", { length: 256 }).notNull(),
  standardScope: text("standard_scope").notNull(),
  auditStartDate: timestamp("audit_start_date", { withTimezone: true, mode: "date" }),
  auditEndDate: timestamp("audit_end_date", { withTimezone: true, mode: "date" }),
  outcomeSummary: text("outcome_summary"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const cbAuditFinding = pgTable("cb_audit_finding", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  certificationBodyAuditId: uuid("certification_body_audit_id")
    .notNull()
    .references(() => certificationBodyAudit.id, { onDelete: "cascade" }),
  findingType: auditFindingTypeEnum("finding_type").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  details: text("details"),
  correctiveActionId: uuid("corrective_action_id").references(() => correctiveAction.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const managementCertificate = pgTable("management_certificate", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  standardName: varchar("standard_name", { length: 128 }).notNull(),
  certificateNumber: varchar("certificate_number", { length: 256 }),
  certificationBodyName: varchar("certification_body_name", { length: 256 }).notNull(),
  scopeStatement: text("scope_statement").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true, mode: "date" }),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const certificationBodyAuditRelations = relations(
  certificationBodyAudit,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [certificationBodyAudit.organizationId],
      references: [organization.id],
    }),
    findings: many(cbAuditFinding),
  }),
);

export const cbAuditFindingRelations = relations(cbAuditFinding, ({ one }) => ({
  organization: one(organization, {
    fields: [cbAuditFinding.organizationId],
    references: [organization.id],
  }),
  audit: one(certificationBodyAudit, {
    fields: [cbAuditFinding.certificationBodyAuditId],
    references: [certificationBodyAudit.id],
  }),
  correctiveAction: one(correctiveAction, {
    fields: [cbAuditFinding.correctiveActionId],
    references: [correctiveAction.id],
  }),
}));

export const correctiveActionRelations = relations(
  correctiveAction,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [correctiveAction.organizationId],
      references: [organization.id],
    }),
    incident: one(incident, {
      fields: [correctiveAction.incidentId],
      references: [incident.id],
    }),
    owner: one(authUser, {
      fields: [correctiveAction.ownerUserId],
      references: [authUser.id],
    }),
    auditFindings: many(auditFinding),
    cbFindings: many(cbAuditFinding),
    environmentalAspect: one(environmentalAspect, {
      fields: [correctiveAction.environmentalAspectId],
      references: [environmentalAspect.id],
    }),
    complianceObligation: one(complianceObligation, {
      fields: [correctiveAction.complianceObligationId],
      references: [complianceObligation.id],
    }),
    managementReview: one(managementReview, {
      fields: [correctiveAction.managementReviewId],
      references: [managementReview.id],
    }),
    environmentalRegulatoryPermit: one(environmentalRegulatoryPermit, {
      fields: [correctiveAction.environmentalRegulatoryPermitId],
      references: [environmentalRegulatoryPermit.id],
    }),
  }),
);

export const managementCertificateRelations = relations(
  managementCertificate,
  ({ one }) => ({
    organization: one(organization, {
      fields: [managementCertificate.organizationId],
      references: [organization.id],
    }),
  }),
);

/* ——— KPI & measurement ——— */
export const kpiTypeEnum = pgEnum("kpi_type", ["lagging", "leading"]);

export const kpiDefinition = pgTable("kpi_definition", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  name: varchar("name", { length: 512 }).notNull(),
  description: text("description"),
  kpiType: kpiTypeEnum("kpi_type").notNull().default("leading"),
  targetValue: varchar("target_value", { length: 128 }),
  frequencyNote: varchar("frequency_note", { length: 256 }),
  formulaText: text("formula_text"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const measurementCategoryEnum = pgEnum("measurement_category", [
  "noise",
  "air",
  "water",
  "energy",
  "other",
]);

export const measurementRecord = pgTable("measurement_record", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  kpiDefinitionId: uuid("kpi_definition_id").references(() => kpiDefinition.id, {
    onDelete: "set null",
  }),
  category: measurementCategoryEnum("category").notNull().default("other"),
  measuredAt: timestamp("measured_at", { withTimezone: true, mode: "date" }).notNull(),
  valueNumeric: varchar("value_numeric", { length: 64 }),
  unit: varchar("unit", { length: 64 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const equipmentCalibration = pgTable("equipment_calibration", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  equipmentName: varchar("equipment_name", { length: 512 }).notNull(),
  calibrationDue: timestamp("calibration_due", { withTimezone: true, mode: "date" }),
  lastCalibrationAt: timestamp("last_calibration_at", { withTimezone: true, mode: "date" }),
  certificateRef: varchar("certificate_ref", { length: 256 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const kpiDefinitionRelations = relations(kpiDefinition, ({ one, many }) => ({
  organization: one(organization, {
    fields: [kpiDefinition.organizationId],
    references: [organization.id],
  }),
  site: one(site, {
    fields: [kpiDefinition.siteId],
    references: [site.id],
  }),
  measurements: many(measurementRecord),
}));

export const measurementRecordRelations = relations(measurementRecord, ({ one }) => ({
  organization: one(organization, {
    fields: [measurementRecord.organizationId],
    references: [organization.id],
  }),
  site: one(site, {
    fields: [measurementRecord.siteId],
    references: [site.id],
  }),
  kpi: one(kpiDefinition, {
    fields: [measurementRecord.kpiDefinitionId],
    references: [kpiDefinition.id],
  }),
}));

export const equipmentCalibrationRelations = relations(equipmentCalibration, ({ one }) => ({
  organization: one(organization, {
    fields: [equipmentCalibration.organizationId],
    references: [organization.id],
  }),
}));

/* ——— Workflow transitions & integration outbox ——— */
export const workflowTransition = pgTable("workflow_transition", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  fromStatus: varchar("from_status", { length: 64 }).notNull(),
  toStatus: varchar("to_status", { length: 64 }).notNull(),
  actorUserId: text("actor_user_id").references(() => authUser.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

/** Generic approval gate for regulated workflow (CAPA-first; extend entity types over time). */
export const approvalEntityTypeEnum = pgEnum("approval_entity_type", [
  "capa",
  "incident",
  "work_permit",
  "environmental_regulatory_permit",
]);

export const approvalRequestStatusEnum = pgEnum("approval_request_status", [
  "open",
  "approved",
  "rejected",
  "cancelled",
]);

export const approvalStepStatusEnum = pgEnum("approval_step_status", [
  "pending",
  "approved",
  "rejected",
  "skipped",
]);

export const approvalRequest = pgTable("approval_request", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  entityType: approvalEntityTypeEnum("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  status: approvalRequestStatusEnum("status").notNull().default("open"),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const approvalStep = pgTable(
  "approval_step",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => approvalRequest.id, { onDelete: "cascade" }),
    stepOrder: integer("step_order").notNull(),
    approverUserId: text("approver_user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    status: approvalStepStatusEnum("status").notNull().default("pending"),
    comment: text("comment"),
    decidedAt: timestamp("decided_at", { withTimezone: true, mode: "date" }),
    /** SLA deadline for pending steps; overdue triggers escalation_event rows via cron. */
    dueAt: timestamp("due_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("approval_step_request_order_uniq").on(t.requestId, t.stepOrder)],
);

export const approvalRequestRelations = relations(approvalRequest, ({ one, many }) => ({
  organization: one(organization, {
    fields: [approvalRequest.organizationId],
    references: [organization.id],
  }),
  createdBy: one(authUser, {
    fields: [approvalRequest.createdByUserId],
    references: [authUser.id],
  }),
  steps: many(approvalStep),
}));

export const approvalStepRelations = relations(approvalStep, ({ one }) => ({
  request: one(approvalRequest, {
    fields: [approvalStep.requestId],
    references: [approvalRequest.id],
  }),
  approver: one(authUser, {
    fields: [approvalStep.approverUserId],
    references: [authUser.id],
  }),
}));

export const integrationEvent = pgTable("integration_event", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 128 }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "date" }),
  /** pending → applied | failed; supports DLQ replay without losing raw payload. */
  processingStatus: varchar("processing_status", { length: 24 })
    .notNull()
    .default("pending"),
  processingError: text("processing_error"),
  appliedAt: timestamp("applied_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

/**
 * Idempotent webhook delivery per org + connector key (`idempotencyKey` on inbound JSON body).
 * Caches outbound JSON bodies for HTTP replays until manual deletion (retention handled separately).
 */
export const integrationInboundIdempotency = pgTable(
  "integration_inbound_idempotency",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    inboundKey: varchar("inbound_key", { length: 512 }).notNull(),
    httpStatus: integer("http_status").notNull(),
    responseJson: jsonb("response_json").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("integration_inbound_idempotency_org_key_uq").on(t.organizationId, t.inboundKey)],
);

/**
 * Tenant-configured HTTPS webhooks for operational signals (cron / inbound integration outcomes).
 * Mutations restricted to org admins; payloads are documented in docs/operational-webhooks.md.
 */
export const operationalWebhookEndpoint = pgTable(
  "operational_webhook_endpoint",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** HTTPS POST receiver (Teams/Slack/generic). */
    targetUrl: varchar("target_url", { length: 2048 }).notNull(),
    /** Optional shared secret — HMAC-SHA256 over raw JSON body (`X-EHS-Signature`). */
    secret: varchar("secret", { length: 256 }),
    /** Subscribed canonical event ids, e.g. `observation.follow_up_escalated`. */
    subscribedEvents: jsonb("subscribed_events").$type<string[]>().notNull().$defaultFn(() => []),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("operational_webhook_endpoint_org_idx").on(t.organizationId),
  ],
);

/**
 * Tenant field-mapping hints for LMS/HRIS inbound envelopes (`POST /api/integration/inbound`).
 * Does not mutate inbound routing — referenced by operators and outbound warehouse exports.
 */
export const integrationConnectorMapping = pgTable(
  "integration_connector_mapping",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    connectorKey: varchar("connector_key", { length: 64 }).notNull(),
    mappingJson: jsonb("mapping_json").notNull().$type<Record<string, unknown>>(),
    schemaVersion: integer("schema_version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    unique("integration_connector_mapping_org_connector_uq").on(
      t.organizationId,
      t.connectorKey,
    ),
    index("integration_connector_mapping_org_idx").on(t.organizationId),
  ],
);

/** Per-org SCIM 2.0 provisioning config (PortCo identity Phase 1). */
export const organizationScimConfig = pgTable(
  "organization_scim_config",
  {
    organizationId: uuid("organization_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(false),
    /** SHA-256 hex of bearer token — plain token shown once on rotate. */
    bearerTokenHash: varchar("bearer_token_hash", { length: 64 }),
    /** Default role slug when SCIM group mapping does not match. */
    defaultRoleSlug: varchar("default_role_slug", { length: 64 }).notNull().default("supervisor"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
);

/** IdP group id → org role for SCIM group push (optional; user provisioning uses defaultRoleSlug). */
export const scimGroupMapping = pgTable(
  "scim_group_mapping",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    idpGroupId: varchar("idp_group_id", { length: 256 }).notNull(),
    idpGroupDisplayName: varchar("idp_group_display_name", { length: 256 }),
    roleSlug: varchar("role_slug", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    unique("scim_group_mapping_org_group_uq").on(t.organizationId, t.idpGroupId),
    index("scim_group_mapping_org_idx").on(t.organizationId),
  ],
);

/** SCIM Group membership — IdP group id + user for role assignment via scim_group_mapping. */
export const scimGroupMember = pgTable(
  "scim_group_member",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    idpGroupId: varchar("idp_group_id", { length: 256 }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    unique("scim_group_member_org_group_user_uq").on(t.organizationId, t.idpGroupId, t.userId),
    index("scim_group_member_org_group_idx").on(t.organizationId, t.idpGroupId),
  ],
);

/** HRIS roster snapshot for nightly reconciliation (PortCo Phase 3). */
export const integrationRosterSnapshot = pgTable(
  "integration_roster_snapshot",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 64 }).notNull().default("hris_export"),
    capturedAt: timestamp("captured_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    /** Array of { workerEmail, externalWorkerId? } from upstream HRIS export. */
    workers: jsonb("workers").notNull(),
  },
  (t) => [index("integration_roster_snapshot_org_captured_idx").on(t.organizationId, t.capturedAt)],
);

/** Multi-org OIDC JIT: IdP claim value → org + role (PortCo Phase 1). */
export const oidcJitClaimRule = pgTable(
  "oidc_jit_claim_rule",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** JWT claim to inspect, e.g. `groups` or custom `legal_entity_id`. */
    claimKey: varchar("claim_key", { length: 128 }).notNull().default("groups"),
    /** Exact string match within claim array or scalar. */
    matchValue: varchar("match_value", { length: 256 }).notNull(),
    roleSlug: varchar("role_slug", { length: 64 }).notNull(),
    priority: integer("priority").notNull().default(100),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("oidc_jit_claim_rule_org_priority_idx").on(t.organizationId, t.priority),
  ],
);

/** Persisted OSHA-style incidence rate calculations for audit defensibility. */
export const complianceMetricSnapshot = pgTable(
  "compliance_metric_snapshot",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    establishmentId: uuid("establishment_id").references(() => establishment.id, {
      onDelete: "set null",
    }),
    metricKey: varchar("metric_key", { length: 64 }).notNull(),
    calendarYear: integer("calendar_year").notNull(),
    formulaVersion: integer("formula_version").notNull(),
    inputsHash: varchar("inputs_hash", { length: 64 }).notNull(),
    inputsJson: jsonb("inputs_json").notNull().$type<Record<string, unknown>>(),
    resultJson: jsonb("result_json").notNull().$type<Record<string, unknown>>(),
    computedByUserId: text("computed_by_user_id").references(() => authUser.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("compliance_metric_snapshot_org_year_idx").on(
      t.organizationId,
      t.calendarYear,
      t.metricKey,
    ),
  ],
);

export const slaPolicy = pgTable("sla_policy", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 256 }).notNull(),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  overdueDays: integer("overdue_days").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const escalationEvent = pgTable("escalation_event", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  detectedAt: timestamp("detected_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  notifiedUserIds: jsonb("notified_user_ids").$type<string[]>().notNull().$defaultFn(() => []),
  message: text("message"),
});

export const organizationSetupStep = pgTable(
  "organization_setup_step",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    stepKey: varchar("step_key", { length: 64 }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.stepKey] })],
);

export const workflowTransitionRelations = relations(workflowTransition, ({ one }) => ({
  organization: one(organization, {
    fields: [workflowTransition.organizationId],
    references: [organization.id],
  }),
  actor: one(authUser, {
    fields: [workflowTransition.actorUserId],
    references: [authUser.id],
  }),
}));

export const integrationEventRelations = relations(integrationEvent, ({ one }) => ({
  organization: one(organization, {
    fields: [integrationEvent.organizationId],
    references: [organization.id],
  }),
}));

export const slaPolicyRelations = relations(slaPolicy, ({ one }) => ({
  organization: one(organization, {
    fields: [slaPolicy.organizationId],
    references: [organization.id],
  }),
}));

export const escalationEventRelations = relations(escalationEvent, ({ one }) => ({
  organization: one(organization, {
    fields: [escalationEvent.organizationId],
    references: [organization.id],
  }),
}));

export const operationalWebhookEndpointRelations = relations(operationalWebhookEndpoint, ({ one }) => ({
  organization: one(organization, {
    fields: [operationalWebhookEndpoint.organizationId],
    references: [organization.id],
  }),
}));

export const integrationConnectorMappingRelations = relations(integrationConnectorMapping, ({ one }) => ({
  organization: one(organization, {
    fields: [integrationConnectorMapping.organizationId],
    references: [organization.id],
  }),
}));

export const organizationScimConfigRelations = relations(organizationScimConfig, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationScimConfig.organizationId],
    references: [organization.id],
  }),
}));

export const scimGroupMappingRelations = relations(scimGroupMapping, ({ one }) => ({
  organization: one(organization, {
    fields: [scimGroupMapping.organizationId],
    references: [organization.id],
  }),
}));

export const scimGroupMemberRelations = relations(scimGroupMember, ({ one }) => ({
  organization: one(organization, {
    fields: [scimGroupMember.organizationId],
    references: [organization.id],
  }),
  user: one(authUser, {
    fields: [scimGroupMember.userId],
    references: [authUser.id],
  }),
}));

export const integrationRosterSnapshotRelations = relations(integrationRosterSnapshot, ({ one }) => ({
  organization: one(organization, {
    fields: [integrationRosterSnapshot.organizationId],
    references: [organization.id],
  }),
}));

export const oidcJitClaimRuleRelations = relations(oidcJitClaimRule, ({ one }) => ({
  organization: one(organization, {
    fields: [oidcJitClaimRule.organizationId],
    references: [organization.id],
  }),
}));

export const organizationSetupStepRelations = relations(organizationSetupStep, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationSetupStep.organizationId],
    references: [organization.id],
  }),
}));

/* ——— ContextSync protocol (subset: artifacts, versions, grants, provenance; SSE deferred) ——— */
export const contextSyncArtifact = pgTable(
  "context_sync_artifact",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** Full ContextSync URI, e.g. ctx://{org_uuid}/{domain}/{artifact_path} */
    uri: varchar("uri", { length: 2048 }).notNull().unique(),
    domainSegment: varchar("domain_segment", { length: 128 }).notNull(),
    artifactPath: varchar("artifact_path", { length: 1024 }).notNull(),
    name: varchar("name", { length: 512 }).notNull(),
    contentType: varchar("content_type", { length: 256 }).notNull().default("text/plain"),
    headVersion: integer("head_version").notNull().default(1),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orgDomainIdx: index("context_sync_artifact_org_domain_idx").on(
      t.organizationId,
      t.domainSegment,
    ),
  }),
);

export const contextSyncArtifactVersion = pgTable(
  "context_sync_artifact_version",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artifactId: uuid("artifact_id")
      .notNull()
      .references(() => contextSyncArtifact.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    contentSha256: varchar("content_sha256", { length: 64 }).notNull(),
    summary: varchar("summary", { length: 1024 }),
    /** Declared actor id (e.g. human:{userId}) at write time */
    authorActorId: varchar("author_actor_id", { length: 256 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    artifactVersionUnique: unique("context_sync_artifact_version_artifact_ver_uq").on(
      t.artifactId,
      t.version,
    ),
    artifactVersionIdx: index("context_sync_artifact_version_artifact_idx").on(t.artifactId),
  }),
);

export const contextSyncProvenance = pgTable(
  "context_sync_provenance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    actorId: varchar("actor_id", { length: 256 }).notNull(),
    operation: contextSyncProvOpEnum("operation").notNull(),
    artifactUri: varchar("artifact_uri", { length: 2048 }).notNull(),
    versionTouched: integer("version_touched").notNull(),
    downstreamUri: varchar("downstream_uri", { length: 2048 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    provOrgCreatedIdx: index("context_sync_provenance_org_created_idx").on(
      t.organizationId,
      t.createdAt,
    ),
    provArtifactIdx: index("context_sync_provenance_artifact_idx").on(t.artifactUri),
  }),
);

export const contextSyncGrant = pgTable(
  "context_sync_grant",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    actorId: varchar("actor_id", { length: 256 }),
    agentClass: varchar("agent_class", { length: 128 }),
    artifactPattern: varchar("artifact_pattern", { length: 2048 }).notNull(),
    operations: jsonb("operations").$type<string[]>().notNull(),
    createdByUserId: text("created_by_user_id").references(() => authUser.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    grantOrgIdx: index("context_sync_grant_org_idx").on(t.organizationId),
  }),
);

export const contextSyncActor = pgTable(
  "context_sync_actor",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    actorId: varchar("actor_id", { length: 256 }).notNull(),
    actorType: varchar("actor_type", { length: 16 }).notNull(),
    name: varchar("name", { length: 512 }).notNull(),
    agentClass: varchar("agent_class", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.organizationId, t.actorId] }),
  }),
);

/** Binds Better Auth human users who may legally assert X-Agent-Class for scoped protocol grants */
export const contextSyncAgentClassClaim = pgTable(
  "context_sync_agent_class_claim",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    agentClass: varchar("agent_class", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orgUserClassUq: unique("context_sync_agent_class_claim_org_user_class_uq").on(
      t.organizationId,
      t.userId,
      t.agentClass,
    ),
    claimOrgIdx: index("context_sync_agent_class_claim_org_idx").on(t.organizationId),
  }),
);

export const contextSyncArtifactRelations = relations(contextSyncArtifact, ({ one, many }) => ({
  organization: one(organization, {
    fields: [contextSyncArtifact.organizationId],
    references: [organization.id],
  }),
  versions: many(contextSyncArtifactVersion),
}));

export const contextSyncArtifactVersionRelations = relations(
  contextSyncArtifactVersion,
  ({ one }) => ({
    artifact: one(contextSyncArtifact, {
      fields: [contextSyncArtifactVersion.artifactId],
      references: [contextSyncArtifact.id],
    }),
  }),
);

export const contextSyncProvenanceRelations = relations(contextSyncProvenance, ({ one }) => ({
  organization: one(organization, {
    fields: [contextSyncProvenance.organizationId],
    references: [organization.id],
  }),
}));

export const contextSyncGrantRelations = relations(contextSyncGrant, ({ one }) => ({
  organization: one(organization, {
    fields: [contextSyncGrant.organizationId],
    references: [organization.id],
  }),
}));

export const contextSyncActorRelations = relations(contextSyncActor, ({ one }) => ({
  organization: one(organization, {
    fields: [contextSyncActor.organizationId],
    references: [organization.id],
  }),
}));

export const contextSyncAgentClassClaimRelations = relations(
  contextSyncAgentClassClaim,
  ({ one }) => ({
    organization: one(organization, {
      fields: [contextSyncAgentClassClaim.organizationId],
      references: [organization.id],
    }),
  }),
);

/* ——— RAG / document intelligence (chunked corpus, optional embeddings) ——— */
export const ragSource = pgTable("rag_source", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
  title: varchar("title", { length: 512 }).notNull(),
  sourceUri: varchar("source_uri", { length: 2048 }),
  /** e.g. environmental | oh_safety | general */
  programTag: varchar("program_tag", { length: 64 }),
  topicTags: jsonb("topic_tags").$type<string[]>().notNull().$defaultFn(() => []),
  rawText: text("raw_text"),
  mimeType: varchar("mime_type", { length: 128 }).notNull().default("text/plain"),
  status: varchar("status", { length: 32 }).notNull().default("ready"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const ragChunk = pgTable(
  "rag_chunk",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => ragSource.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    /** Optional embedding vector as JSON array; legacy fallback ranking in app */
    embedding: jsonb("embedding").$type<number[] | null>(),
    /** pgvector column for similarity search (requires `vector` extension). */
    embeddingVector: vector1536("embedding_vector"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().$defaultFn(() => ({})),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  () => ({
    embeddingVectorHnswIdx: index("rag_chunk_embedding_vector_hnsw_idx")
      .using("hnsw", sql`embedding_vector vector_cosine_ops`)
      .where(sql`embedding_vector IS NOT NULL`),
  }),
);

export const obligationEvidenceLink = pgTable("obligation_evidence_link", {
  id: uuid("id").defaultRandom().primaryKey(),
  obligationId: uuid("obligation_id")
    .notNull()
    .references(() => complianceObligation.id, { onDelete: "cascade" }),
  controlledDocumentId: uuid("controlled_document_id").references(
    () => controlledDocument.id,
    { onDelete: "cascade" },
  ),
  ragSourceId: uuid("rag_source_id").references(() => ragSource.id, {
    onDelete: "cascade",
  }),
  note: varchar("note", { length: 512 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const obligationEvidenceLinkRelations = relations(obligationEvidenceLink, ({ one }) => ({
  obligation: one(complianceObligation, {
    fields: [obligationEvidenceLink.obligationId],
    references: [complianceObligation.id],
  }),
  document: one(controlledDocument, {
    fields: [obligationEvidenceLink.controlledDocumentId],
    references: [controlledDocument.id],
  }),
  ragSource: one(ragSource, {
    fields: [obligationEvidenceLink.ragSourceId],
    references: [ragSource.id],
  }),
}));

export const ragSourceRelations = relations(ragSource, ({ one, many }) => ({
  organization: one(organization, {
    fields: [ragSource.organizationId],
    references: [organization.id],
  }),
  site: one(site, {
    fields: [ragSource.siteId],
    references: [site.id],
  }),
  chunks: many(ragChunk),
}));

export const ragChunkRelations = relations(ragChunk, ({ one }) => ({
  organization: one(organization, {
    fields: [ragChunk.organizationId],
    references: [organization.id],
  }),
  source: one(ragSource, {
    fields: [ragChunk.sourceId],
    references: [ragSource.id],
  }),
}));
