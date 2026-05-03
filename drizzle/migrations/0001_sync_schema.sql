CREATE TYPE "public"."audit_finding_type" AS ENUM('observation', 'minor_nc', 'major_nc', 'opportunity');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'approved', 'obsolete');--> statement-breakpoint
CREATE TYPE "public"."internal_audit_status" AS ENUM('planned', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."objective_status" AS ENUM('active', 'achieved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."objective_type" AS ENUM('oh_safety', 'environmental');--> statement-breakpoint
CREATE TYPE "public"."risk_rating" AS ENUM('low', 'medium', 'high', 'very_high');--> statement-breakpoint
CREATE TABLE "audit_finding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"internal_audit_id" uuid NOT NULL,
	"finding_type" "audit_finding_type" NOT NULL,
	"title" varchar(512) NOT NULL,
	"details" text,
	"corrective_action_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hazard" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid,
	"title" varchar(512) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" varchar(512) NOT NULL,
	"scope" text NOT NULL,
	"status" "internal_audit_status" DEFAULT 'planned' NOT NULL,
	"planned_date" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"lead_auditor_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "management_objective" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" "objective_type" NOT NULL,
	"title" varchar(512) NOT NULL,
	"description" text,
	"target_metrics" text,
	"due_date" timestamp with time zone,
	"status" "objective_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_control" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" varchar(512) NOT NULL,
	"description" text,
	"environmental_aspect_id" uuid,
	"hazard_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"hazard_id" uuid,
	"context" text NOT NULL,
	"existing_controls" text,
	"residual_rating" "risk_rating" DEFAULT 'medium' NOT NULL,
	"assessed_by_user_id" text,
	"assessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"trainee_name" varchar(256) NOT NULL,
	"user_id" text,
	"course_title" varchar(512) NOT NULL,
	"completed_on" timestamp with time zone,
	"expires_on" timestamp with time zone,
	"evidence_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "controlled_document" ADD COLUMN "status" "document_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "controlled_document" ADD COLUMN "approved_by_user_id" text;--> statement-breakpoint
ALTER TABLE "controlled_document" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "controlled_document" ADD COLUMN "evidence_url" varchar(2048);--> statement-breakpoint
ALTER TABLE "controlled_document" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "environmental_aspect" ADD COLUMN "activity" varchar(512);--> statement-breakpoint
ALTER TABLE "environmental_aspect" ADD COLUMN "environmental_impact" text;--> statement-breakpoint
ALTER TABLE "management_review" ADD COLUMN "action_items" text;--> statement-breakpoint
ALTER TABLE "management_review" ADD COLUMN "next_review_due" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "management_review" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_finding" ADD CONSTRAINT "audit_finding_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_finding" ADD CONSTRAINT "audit_finding_internal_audit_id_internal_audit_id_fk" FOREIGN KEY ("internal_audit_id") REFERENCES "public"."internal_audit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_finding" ADD CONSTRAINT "audit_finding_corrective_action_id_corrective_action_id_fk" FOREIGN KEY ("corrective_action_id") REFERENCES "public"."corrective_action"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hazard" ADD CONSTRAINT "hazard_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hazard" ADD CONSTRAINT "hazard_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_audit" ADD CONSTRAINT "internal_audit_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_audit" ADD CONSTRAINT "internal_audit_lead_auditor_user_id_user_id_fk" FOREIGN KEY ("lead_auditor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_objective" ADD CONSTRAINT "management_objective_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_control" ADD CONSTRAINT "operational_control_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_control" ADD CONSTRAINT "operational_control_environmental_aspect_id_environmental_aspect_id_fk" FOREIGN KEY ("environmental_aspect_id") REFERENCES "public"."environmental_aspect"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_control" ADD CONSTRAINT "operational_control_hazard_id_hazard_id_fk" FOREIGN KEY ("hazard_id") REFERENCES "public"."hazard"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD CONSTRAINT "risk_assessment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD CONSTRAINT "risk_assessment_hazard_id_hazard_id_fk" FOREIGN KEY ("hazard_id") REFERENCES "public"."hazard"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD CONSTRAINT "risk_assessment_assessed_by_user_id_user_id_fk" FOREIGN KEY ("assessed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_record" ADD CONSTRAINT "training_record_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_record" ADD CONSTRAINT "training_record_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "controlled_document" ADD CONSTRAINT "controlled_document_approved_by_user_id_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;