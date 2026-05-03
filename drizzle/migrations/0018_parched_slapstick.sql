CREATE TYPE "public"."environmental_regulatory_permit_media" AS ENUM('air', 'water', 'waste', 'general');--> statement-breakpoint
CREATE TYPE "public"."environmental_regulatory_permit_status" AS ENUM('draft', 'active', 'suspended', 'expired', 'closed');--> statement-breakpoint
CREATE TYPE "public"."risk_assessment_kind" AS ENUM('general', 'task_based', 'site_based');--> statement-breakpoint
CREATE TYPE "public"."risk_assessment_status" AS ENUM('draft', 'active', 'under_review', 'archived');--> statement-breakpoint
ALTER TYPE "public"."data_retention_record_class" ADD VALUE 'environmental_regulatory_permit_program';--> statement-breakpoint
ALTER TYPE "public"."data_retention_record_class" ADD VALUE 'risk_assessment_program';--> statement-breakpoint
CREATE TABLE "environmental_regulatory_permit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid,
	"title" varchar(512) NOT NULL,
	"permit_identifier" varchar(256) NOT NULL,
	"agency" varchar(256),
	"jurisdiction" varchar(256),
	"media" "environmental_regulatory_permit_media" DEFAULT 'general' NOT NULL,
	"status" "environmental_regulatory_permit_status" DEFAULT 'draft' NOT NULL,
	"issued_at" timestamp with time zone,
	"effective_from" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"legal_citations" text,
	"limits" jsonb,
	"compliance_obligation_id" uuid,
	"owner_user_id" text,
	"retain_until" timestamp with time zone,
	"legal_hold" boolean DEFAULT false NOT NULL,
	"anonymized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "environmental_regulatory_permit_condition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"permit_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"condition_text" text NOT NULL,
	"reference_code" varchar(256),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_assessment_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"risk_assessment_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"task_description" text NOT NULL,
	"hazard_text" text NOT NULL,
	"controls_text" text,
	"inherent_rating" "risk_rating",
	"residual_rating" "risk_rating",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "corrective_action" ADD COLUMN "environmental_regulatory_permit_id" uuid;--> statement-breakpoint
ALTER TABLE "environmental_monitoring_result" ADD COLUMN "environmental_regulatory_permit_id" uuid;--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD COLUMN "summary_title" varchar(512);--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD COLUMN "assessment_kind" "risk_assessment_kind" DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD COLUMN "status" "risk_assessment_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD COLUMN "review_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD COLUMN "retain_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD COLUMN "legal_hold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD COLUMN "anonymized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "environmental_regulatory_permit" ADD CONSTRAINT "environmental_regulatory_permit_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environmental_regulatory_permit" ADD CONSTRAINT "environmental_regulatory_permit_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environmental_regulatory_permit" ADD CONSTRAINT "environmental_regulatory_permit_compliance_obligation_id_compliance_obligation_id_fk" FOREIGN KEY ("compliance_obligation_id") REFERENCES "public"."compliance_obligation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environmental_regulatory_permit" ADD CONSTRAINT "environmental_regulatory_permit_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environmental_regulatory_permit_condition" ADD CONSTRAINT "environmental_regulatory_permit_condition_permit_id_environmental_regulatory_permit_id_fk" FOREIGN KEY ("permit_id") REFERENCES "public"."environmental_regulatory_permit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessment_step" ADD CONSTRAINT "risk_assessment_step_risk_assessment_id_risk_assessment_id_fk" FOREIGN KEY ("risk_assessment_id") REFERENCES "public"."risk_assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "env_reg_permit_org_status_idx" ON "environmental_regulatory_permit" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "env_reg_permit_org_expires_idx" ON "environmental_regulatory_permit" USING btree ("organization_id","expires_at");--> statement-breakpoint
CREATE INDEX "env_reg_permit_condition_permit_idx" ON "environmental_regulatory_permit_condition" USING btree ("permit_id");--> statement-breakpoint
CREATE INDEX "risk_assessment_step_parent_idx" ON "risk_assessment_step" USING btree ("risk_assessment_id");--> statement-breakpoint
ALTER TABLE "corrective_action" ADD CONSTRAINT "corrective_action_environmental_regulatory_permit_id_environmental_regulatory_permit_id_fk" FOREIGN KEY ("environmental_regulatory_permit_id") REFERENCES "public"."environmental_regulatory_permit"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environmental_monitoring_result" ADD CONSTRAINT "environmental_monitoring_result_environmental_regulatory_permit_id_environmental_regulatory_permit_id_fk" FOREIGN KEY ("environmental_regulatory_permit_id") REFERENCES "public"."environmental_regulatory_permit"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD CONSTRAINT "risk_assessment_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "risk_assessment_org_kind_status_idx" ON "risk_assessment" USING btree ("organization_id","assessment_kind","status");--> statement-breakpoint
CREATE INDEX "risk_assessment_org_site_idx" ON "risk_assessment" USING btree ("organization_id","site_id");