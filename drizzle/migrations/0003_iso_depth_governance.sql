CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."aspect_lifecycle" AS ENUM('raw_material', 'operations', 'transport', 'disposal', 'other');--> statement-breakpoint
CREATE TYPE "public"."context_issue_kind" AS ENUM('internal', 'external');--> statement-breakpoint
CREATE TYPE "public"."external_party_type" AS ENUM('contractor', 'visitor', 'temporary_worker');--> statement-breakpoint
CREATE TYPE "public"."incident_type" AS ENUM('injury', 'ill_health', 'near_miss', 'environmental', 'property_damage', 'other');--> statement-breakpoint
CREATE TYPE "public"."kpi_type" AS ENUM('lagging', 'leading');--> statement-breakpoint
CREATE TYPE "public"."measurement_category" AS ENUM('noise', 'air', 'water', 'energy', 'other');--> statement-breakpoint
CREATE TYPE "public"."moc_status" AS ENUM('draft', 'under_review', 'approved', 'implemented', 'closed');--> statement-breakpoint
CREATE TYPE "public"."policy_revision_status" AS ENUM('draft', 'pending_approval', 'active', 'superseded');--> statement-breakpoint
ALTER TYPE "public"."corrective_action_status" ADD VALUE 'pending_approval' BEFORE 'planned';--> statement-breakpoint
ALTER TYPE "public"."document_status" ADD VALUE 'obsolete_retained';--> statement-breakpoint
CREATE TABLE "cb_audit_finding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"certification_body_audit_id" uuid NOT NULL,
	"finding_type" "audit_finding_type" NOT NULL,
	"title" varchar(512) NOT NULL,
	"details" text,
	"corrective_action_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certification_body_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"certification_body_name" varchar(256) NOT NULL,
	"standard_scope" text NOT NULL,
	"audit_start_date" timestamp with time zone,
	"audit_end_date" timestamp with time zone,
	"outcome_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultation_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"topic" varchar(512) NOT NULL,
	"consulted_at" timestamp with time zone NOT NULL,
	"outcome_summary" text,
	"related_incident_id" uuid,
	"related_objective_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "context_issue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" "context_issue_kind" NOT NULL,
	"category" varchar(128) NOT NULL,
	"description" text NOT NULL,
	"review_due" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_distribution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_revision_id" uuid NOT NULL,
	"site_id" uuid,
	"user_id" text,
	"role_id" uuid,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"revision" varchar(32) NOT NULL,
	"title" varchar(512) NOT NULL,
	"summary" text,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"effective_date" timestamp with time zone,
	"approved_by_user_id" text,
	"approved_at" timestamp with time zone,
	"is_current" boolean DEFAULT false NOT NULL,
	"evidence_url" varchar(2048),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_drill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"scenario_id" uuid NOT NULL,
	"drill_date" timestamp with time zone NOT NULL,
	"outcome_summary" text,
	"attendees_note" text,
	"related_incident_id" uuid,
	"related_corrective_action_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_prep_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid,
	"scenario_id" uuid,
	"equipment_name" varchar(512) NOT NULL,
	"location_note" text,
	"last_inspected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_scenario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid,
	"name" varchar(512) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "environmental_impact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aspect_id" uuid NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "environmental_monitoring_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid,
	"environmental_aspect_id" uuid,
	"compliance_obligation_id" uuid,
	"parameter_name" varchar(256) NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"value_text" varchar(256) NOT NULL,
	"unit" varchar(64),
	"legal_limit_text" varchar(256),
	"method_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_calibration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"equipment_name" varchar(512) NOT NULL,
	"calibration_due" timestamp with time zone,
	"last_calibration_at" timestamp with time zone,
	"certificate_ref" varchar(256),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escalation_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" uuid NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_user_ids" jsonb NOT NULL,
	"message" text
);
--> statement-breakpoint
CREATE TABLE "external_party" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid,
	"party_type" "external_party_type" NOT NULL,
	"company_name" varchar(512) NOT NULL,
	"contact_name" varchar(256),
	"contact_email" varchar(256),
	"hse_requirements_note" text,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_type" varchar(128) NOT NULL,
	"payload" jsonb NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interested_party" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"requirements_expectations" text,
	"influence_notes" text,
	"review_due" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid,
	"name" varchar(512) NOT NULL,
	"description" text,
	"kpi_type" "kpi_type" DEFAULT 'leading' NOT NULL,
	"target_value" varchar(128),
	"frequency_note" varchar(256),
	"formula_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "management_certificate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"standard_name" varchar(128) NOT NULL,
	"certificate_number" varchar(256),
	"certification_body_name" varchar(256) NOT NULL,
	"scope_statement" text NOT NULL,
	"issued_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "management_of_change" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid,
	"title" varchar(512) NOT NULL,
	"description" text NOT NULL,
	"planned_date" timestamp with time zone,
	"status" "moc_status" DEFAULT 'draft' NOT NULL,
	"oh_safety_impact" boolean DEFAULT false NOT NULL,
	"environmental_impact_flag" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "management_system_scope" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"statement" text NOT NULL,
	"covered_site_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "measurement_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid,
	"kpi_definition_id" uuid,
	"category" "measurement_category" DEFAULT 'other' NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"value_numeric" varchar(64),
	"unit" varchar(64),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moc_entity_link" (
	"moc_id" uuid NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" uuid NOT NULL,
	CONSTRAINT "moc_entity_link_moc_id_entity_type_entity_id_pk" PRIMARY KEY("moc_id","entity_type","entity_id")
);
--> statement-breakpoint
CREATE TABLE "objective_kpi_measurement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"management_objective_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"actual_value" varchar(256) NOT NULL,
	"target_value" varchar(256),
	"unit" varchar(64),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obligation_aspect_link" (
	"obligation_id" uuid NOT NULL,
	"aspect_id" uuid NOT NULL,
	CONSTRAINT "obligation_aspect_link_obligation_id_aspect_id_pk" PRIMARY KEY("obligation_id","aspect_id")
);
--> statement-breakpoint
CREATE TABLE "obligation_evidence_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"obligation_id" uuid NOT NULL,
	"controlled_document_id" uuid,
	"rag_source_id" uuid,
	"note" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obligation_operational_control_link" (
	"obligation_id" uuid NOT NULL,
	"operational_control_id" uuid NOT NULL,
	CONSTRAINT "obligation_operational_control_link_obligation_id_operational_control_id_pk" PRIMARY KEY("obligation_id","operational_control_id")
);
--> statement-breakpoint
CREATE TABLE "obligation_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"obligation_id" uuid NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"outcome_summary" text,
	"next_review_due" timestamp with time zone,
	"reviewer_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_setup_step" (
	"organization_id" uuid NOT NULL,
	"step_key" varchar(64) NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "organization_setup_step_organization_id_step_key_pk" PRIMARY KEY("organization_id","step_key")
);
--> statement-breakpoint
CREATE TABLE "policy_acknowledgement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_revision_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "policy_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_statement_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"version_label" varchar(64) NOT NULL,
	"body" text NOT NULL,
	"summary" text,
	"status" "policy_revision_status" DEFAULT 'draft' NOT NULL,
	"effective_at" timestamp with time zone,
	"approved_by_user_id" text,
	"controlled_document_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_statement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" varchar(512) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sla_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"overdue_days" integer NOT NULL,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_consultation_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid,
	"consultation_date" timestamp with time zone NOT NULL,
	"topic" varchar(512) NOT NULL,
	"oh_safety" boolean DEFAULT true NOT NULL,
	"environmental" boolean DEFAULT false NOT NULL,
	"participants_summary" text,
	"minutes_note" text,
	"controlled_document_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_transition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" uuid NOT NULL,
	"from_status" varchar(64) NOT NULL,
	"to_status" varchar(64) NOT NULL,
	"actor_user_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "compliance_obligation" ADD COLUMN "management_system_scope_id" uuid;--> statement-breakpoint
ALTER TABLE "compliance_obligation" ADD COLUMN "context_issue_id" uuid;--> statement-breakpoint
ALTER TABLE "compliance_obligation" ADD COLUMN "interested_party_id" uuid;--> statement-breakpoint
ALTER TABLE "compliance_obligation" ADD COLUMN "jurisdiction" varchar(256);--> statement-breakpoint
ALTER TABLE "compliance_obligation" ADD COLUMN "applicability_notes" text;--> statement-breakpoint
ALTER TABLE "compliance_obligation" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "compliance_obligation" ADD COLUMN "applicable_site_ids" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "controlled_document" ADD COLUMN "retention_note" text;--> statement-breakpoint
ALTER TABLE "controlled_document" ADD COLUMN "legal_hold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "corrective_action" ADD COLUMN "environmental_aspect_id" uuid;--> statement-breakpoint
ALTER TABLE "corrective_action" ADD COLUMN "compliance_obligation_id" uuid;--> statement-breakpoint
ALTER TABLE "corrective_action" ADD COLUMN "management_review_id" uuid;--> statement-breakpoint
ALTER TABLE "environmental_aspect" ADD COLUMN "management_system_scope_id" uuid;--> statement-breakpoint
ALTER TABLE "environmental_aspect" ADD COLUMN "context_issue_id" uuid;--> statement-breakpoint
ALTER TABLE "environmental_aspect" ADD COLUMN "interested_party_id" uuid;--> statement-breakpoint
ALTER TABLE "environmental_aspect" ADD COLUMN "lifecycle_stage" "aspect_lifecycle";--> statement-breakpoint
ALTER TABLE "environmental_aspect" ADD COLUMN "significance_criteria" jsonb;--> statement-breakpoint
ALTER TABLE "hazard" ADD COLUMN "management_system_scope_id" uuid;--> statement-breakpoint
ALTER TABLE "hazard" ADD COLUMN "context_issue_id" uuid;--> statement-breakpoint
ALTER TABLE "hazard" ADD COLUMN "interested_party_id" uuid;--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "incident_type" "incident_type" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "investigation_owner_user_id" text;--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "external_party_id" uuid;--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "immediate_actions" text;--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "regulatory_notification_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "investigation_notes" text;--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "root_cause_summary" text;--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "linked_hazard_id" uuid;--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "linked_environmental_aspect_id" uuid;--> statement-breakpoint
ALTER TABLE "rag_chunk" ADD COLUMN "embedding_vector" vector(1536);--> statement-breakpoint
ALTER TABLE "cb_audit_finding" ADD CONSTRAINT "cb_audit_finding_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cb_audit_finding" ADD CONSTRAINT "cb_audit_finding_certification_body_audit_id_certification_body_audit_id_fk" FOREIGN KEY ("certification_body_audit_id") REFERENCES "public"."certification_body_audit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cb_audit_finding" ADD CONSTRAINT "cb_audit_finding_corrective_action_id_corrective_action_id_fk" FOREIGN KEY ("corrective_action_id") REFERENCES "public"."corrective_action"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certification_body_audit" ADD CONSTRAINT "certification_body_audit_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_record" ADD CONSTRAINT "consultation_record_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_record" ADD CONSTRAINT "consultation_record_related_incident_id_incident_id_fk" FOREIGN KEY ("related_incident_id") REFERENCES "public"."incident"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_record" ADD CONSTRAINT "consultation_record_related_objective_id_management_objective_id_fk" FOREIGN KEY ("related_objective_id") REFERENCES "public"."management_objective"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_issue" ADD CONSTRAINT "context_issue_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_distribution" ADD CONSTRAINT "document_distribution_document_revision_id_document_revision_id_fk" FOREIGN KEY ("document_revision_id") REFERENCES "public"."document_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_distribution" ADD CONSTRAINT "document_distribution_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_distribution" ADD CONSTRAINT "document_distribution_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_distribution" ADD CONSTRAINT "document_distribution_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_revision" ADD CONSTRAINT "document_revision_document_id_controlled_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."controlled_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_revision" ADD CONSTRAINT "document_revision_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_revision" ADD CONSTRAINT "document_revision_approved_by_user_id_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_drill" ADD CONSTRAINT "emergency_drill_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_drill" ADD CONSTRAINT "emergency_drill_scenario_id_emergency_scenario_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."emergency_scenario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_drill" ADD CONSTRAINT "emergency_drill_related_incident_id_incident_id_fk" FOREIGN KEY ("related_incident_id") REFERENCES "public"."incident"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_drill" ADD CONSTRAINT "emergency_drill_related_corrective_action_id_corrective_action_id_fk" FOREIGN KEY ("related_corrective_action_id") REFERENCES "public"."corrective_action"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_prep_asset" ADD CONSTRAINT "emergency_prep_asset_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_prep_asset" ADD CONSTRAINT "emergency_prep_asset_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_prep_asset" ADD CONSTRAINT "emergency_prep_asset_scenario_id_emergency_scenario_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."emergency_scenario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_scenario" ADD CONSTRAINT "emergency_scenario_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_scenario" ADD CONSTRAINT "emergency_scenario_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environmental_impact" ADD CONSTRAINT "environmental_impact_aspect_id_environmental_aspect_id_fk" FOREIGN KEY ("aspect_id") REFERENCES "public"."environmental_aspect"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environmental_monitoring_result" ADD CONSTRAINT "environmental_monitoring_result_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environmental_monitoring_result" ADD CONSTRAINT "environmental_monitoring_result_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environmental_monitoring_result" ADD CONSTRAINT "environmental_monitoring_result_environmental_aspect_id_environmental_aspect_id_fk" FOREIGN KEY ("environmental_aspect_id") REFERENCES "public"."environmental_aspect"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environmental_monitoring_result" ADD CONSTRAINT "environmental_monitoring_result_compliance_obligation_id_compliance_obligation_id_fk" FOREIGN KEY ("compliance_obligation_id") REFERENCES "public"."compliance_obligation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_calibration" ADD CONSTRAINT "equipment_calibration_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalation_event" ADD CONSTRAINT "escalation_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_party" ADD CONSTRAINT "external_party_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_party" ADD CONSTRAINT "external_party_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_event" ADD CONSTRAINT "integration_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interested_party" ADD CONSTRAINT "interested_party_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_definition" ADD CONSTRAINT "kpi_definition_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_definition" ADD CONSTRAINT "kpi_definition_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_certificate" ADD CONSTRAINT "management_certificate_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_of_change" ADD CONSTRAINT "management_of_change_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_of_change" ADD CONSTRAINT "management_of_change_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_system_scope" ADD CONSTRAINT "management_system_scope_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_record" ADD CONSTRAINT "measurement_record_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_record" ADD CONSTRAINT "measurement_record_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_record" ADD CONSTRAINT "measurement_record_kpi_definition_id_kpi_definition_id_fk" FOREIGN KEY ("kpi_definition_id") REFERENCES "public"."kpi_definition"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_entity_link" ADD CONSTRAINT "moc_entity_link_moc_id_management_of_change_id_fk" FOREIGN KEY ("moc_id") REFERENCES "public"."management_of_change"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_kpi_measurement" ADD CONSTRAINT "objective_kpi_measurement_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective_kpi_measurement" ADD CONSTRAINT "objective_kpi_measurement_management_objective_id_management_objective_id_fk" FOREIGN KEY ("management_objective_id") REFERENCES "public"."management_objective"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_aspect_link" ADD CONSTRAINT "obligation_aspect_link_obligation_id_compliance_obligation_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."compliance_obligation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_aspect_link" ADD CONSTRAINT "obligation_aspect_link_aspect_id_environmental_aspect_id_fk" FOREIGN KEY ("aspect_id") REFERENCES "public"."environmental_aspect"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_evidence_link" ADD CONSTRAINT "obligation_evidence_link_obligation_id_compliance_obligation_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."compliance_obligation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_evidence_link" ADD CONSTRAINT "obligation_evidence_link_controlled_document_id_controlled_document_id_fk" FOREIGN KEY ("controlled_document_id") REFERENCES "public"."controlled_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_evidence_link" ADD CONSTRAINT "obligation_evidence_link_rag_source_id_rag_source_id_fk" FOREIGN KEY ("rag_source_id") REFERENCES "public"."rag_source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_operational_control_link" ADD CONSTRAINT "obligation_operational_control_link_obligation_id_compliance_obligation_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."compliance_obligation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_operational_control_link" ADD CONSTRAINT "obligation_operational_control_link_operational_control_id_operational_control_id_fk" FOREIGN KEY ("operational_control_id") REFERENCES "public"."operational_control"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_review" ADD CONSTRAINT "obligation_review_obligation_id_compliance_obligation_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."compliance_obligation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_review" ADD CONSTRAINT "obligation_review_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_setup_step" ADD CONSTRAINT "organization_setup_step_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_acknowledgement" ADD CONSTRAINT "policy_acknowledgement_policy_revision_id_policy_revision_id_fk" FOREIGN KEY ("policy_revision_id") REFERENCES "public"."policy_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_acknowledgement" ADD CONSTRAINT "policy_acknowledgement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_revision" ADD CONSTRAINT "policy_revision_policy_statement_id_policy_statement_id_fk" FOREIGN KEY ("policy_statement_id") REFERENCES "public"."policy_statement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_revision" ADD CONSTRAINT "policy_revision_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_revision" ADD CONSTRAINT "policy_revision_approved_by_user_id_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_revision" ADD CONSTRAINT "policy_revision_controlled_document_id_controlled_document_id_fk" FOREIGN KEY ("controlled_document_id") REFERENCES "public"."controlled_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_statement" ADD CONSTRAINT "policy_statement_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_policy" ADD CONSTRAINT "sla_policy_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_consultation_record" ADD CONSTRAINT "worker_consultation_record_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_consultation_record" ADD CONSTRAINT "worker_consultation_record_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_consultation_record" ADD CONSTRAINT "worker_consultation_record_controlled_document_id_controlled_document_id_fk" FOREIGN KEY ("controlled_document_id") REFERENCES "public"."controlled_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_transition" ADD CONSTRAINT "workflow_transition_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_transition" ADD CONSTRAINT "workflow_transition_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_obligation" ADD CONSTRAINT "compliance_obligation_management_system_scope_id_management_system_scope_id_fk" FOREIGN KEY ("management_system_scope_id") REFERENCES "public"."management_system_scope"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_obligation" ADD CONSTRAINT "compliance_obligation_context_issue_id_context_issue_id_fk" FOREIGN KEY ("context_issue_id") REFERENCES "public"."context_issue"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_obligation" ADD CONSTRAINT "compliance_obligation_interested_party_id_interested_party_id_fk" FOREIGN KEY ("interested_party_id") REFERENCES "public"."interested_party"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_obligation" ADD CONSTRAINT "compliance_obligation_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environmental_aspect" ADD CONSTRAINT "environmental_aspect_management_system_scope_id_management_system_scope_id_fk" FOREIGN KEY ("management_system_scope_id") REFERENCES "public"."management_system_scope"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environmental_aspect" ADD CONSTRAINT "environmental_aspect_context_issue_id_context_issue_id_fk" FOREIGN KEY ("context_issue_id") REFERENCES "public"."context_issue"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environmental_aspect" ADD CONSTRAINT "environmental_aspect_interested_party_id_interested_party_id_fk" FOREIGN KEY ("interested_party_id") REFERENCES "public"."interested_party"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hazard" ADD CONSTRAINT "hazard_management_system_scope_id_management_system_scope_id_fk" FOREIGN KEY ("management_system_scope_id") REFERENCES "public"."management_system_scope"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hazard" ADD CONSTRAINT "hazard_context_issue_id_context_issue_id_fk" FOREIGN KEY ("context_issue_id") REFERENCES "public"."context_issue"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hazard" ADD CONSTRAINT "hazard_interested_party_id_interested_party_id_fk" FOREIGN KEY ("interested_party_id") REFERENCES "public"."interested_party"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_investigation_owner_user_id_user_id_fk" FOREIGN KEY ("investigation_owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_external_party_id_external_party_id_fk" FOREIGN KEY ("external_party_id") REFERENCES "public"."external_party"("id") ON DELETE set null ON UPDATE no action;