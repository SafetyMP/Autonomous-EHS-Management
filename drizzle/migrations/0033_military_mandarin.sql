CREATE TYPE "public"."heat_program_check_status" AS ENUM('not_started', 'in_place', 'partial', 'gap', 'not_applicable');--> statement-breakpoint
CREATE TYPE "public"."moc_change_trigger" AS ENUM('process', 'product', 'obligation', 'knowledge', 'supplier', 'organization', 'disruption', 'other');--> statement-breakpoint
ALTER TYPE "public"."membership_lifecycle_status" ADD VALUE 'deprovisioned';--> statement-breakpoint
CREATE TABLE "chemical_hazard_classification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"regulatory_chemical_id" uuid,
	"safety_data_sheet_id" uuid,
	"hazard_domain" varchar(16) NOT NULL,
	"hazard_class" varchar(256) NOT NULL,
	"hazard_category" varchar(128) NOT NULL,
	"source" varchar(32) DEFAULT 'manual' NOT NULL,
	"effective_from" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heat_condition_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"program_id" uuid,
	"site_id" uuid,
	"observed_at" timestamp with time zone NOT NULL,
	"heat_index_f" double precision,
	"wbgt_f" double precision,
	"source" varchar(128),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heat_illness_prevention_program" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid,
	"title" varchar(512) DEFAULT 'Heat illness prevention program' NOT NULL,
	"written_plan_uri" varchar(2048),
	"notes" text,
	"covers_outdoor" boolean DEFAULT true NOT NULL,
	"covers_indoor" boolean DEFAULT false NOT NULL,
	"naics_note" varchar(128),
	"checklist_version" varchar(64) DEFAULT '2026-04-cpl-03-00-024' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "heat_illness_prevention_program_org_site_uniq" UNIQUE("organization_id","site_id")
);
--> statement-breakpoint
CREATE TABLE "heat_program_control_check" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"check_key" varchar(64) NOT NULL,
	"status" "heat_program_check_status" DEFAULT 'not_started' NOT NULL,
	"evidence_notes" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "heat_program_control_check_program_key_uniq" UNIQUE("program_id","check_key")
);
--> statement-breakpoint
CREATE TABLE "integration_roster_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source" varchar(64) DEFAULT 'hris_export' NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workers" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scim_group_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"idp_group_id" varchar(256) NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scim_group_member_org_group_user_uq" UNIQUE("organization_id","idp_group_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "context_issue" ADD COLUMN "environmental_condition_tags" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "environmental_aspect" ADD COLUMN "lifecycle_perspective_note" text;--> statement-breakpoint
ALTER TABLE "environmental_aspect" ADD COLUMN "climate_relevant" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "environmental_aspect" ADD COLUMN "biodiversity_relevant" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "external_party" ADD COLUMN "external_worker_id" varchar(128);--> statement-breakpoint
ALTER TABLE "external_party" ADD COLUMN "hris_source" varchar(64);--> statement-breakpoint
ALTER TABLE "management_of_change" ADD COLUMN "change_trigger" "moc_change_trigger";--> statement-breakpoint
ALTER TABLE "management_of_change" ADD COLUMN "aspects_reviewed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "management_of_change" ADD COLUMN "obligations_reviewed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "management_of_change" ADD COLUMN "controls_updated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "management_of_change" ADD COLUMN "post_implementation_review_due" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "integration_inbound_secret" varchar(256);--> statement-breakpoint
ALTER TABLE "chemical_hazard_classification" ADD CONSTRAINT "chemical_hazard_classification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chemical_hazard_classification" ADD CONSTRAINT "chemical_hazard_classification_regulatory_chemical_id_regulatory_chemical_id_fk" FOREIGN KEY ("regulatory_chemical_id") REFERENCES "public"."regulatory_chemical"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chemical_hazard_classification" ADD CONSTRAINT "chemical_hazard_classification_safety_data_sheet_id_safety_data_sheet_ref_id_fk" FOREIGN KEY ("safety_data_sheet_id") REFERENCES "public"."safety_data_sheet_ref"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heat_condition_log" ADD CONSTRAINT "heat_condition_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heat_condition_log" ADD CONSTRAINT "heat_condition_log_program_id_heat_illness_prevention_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."heat_illness_prevention_program"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heat_condition_log" ADD CONSTRAINT "heat_condition_log_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heat_illness_prevention_program" ADD CONSTRAINT "heat_illness_prevention_program_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heat_illness_prevention_program" ADD CONSTRAINT "heat_illness_prevention_program_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heat_program_control_check" ADD CONSTRAINT "heat_program_control_check_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heat_program_control_check" ADD CONSTRAINT "heat_program_control_check_program_id_heat_illness_prevention_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."heat_illness_prevention_program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_roster_snapshot" ADD CONSTRAINT "integration_roster_snapshot_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scim_group_member" ADD CONSTRAINT "scim_group_member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scim_group_member" ADD CONSTRAINT "scim_group_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chemical_hazard_classification_org_chem_idx" ON "chemical_hazard_classification" USING btree ("organization_id","regulatory_chemical_id");--> statement-breakpoint
CREATE INDEX "heat_condition_log_org_observed_idx" ON "heat_condition_log" USING btree ("organization_id","observed_at");--> statement-breakpoint
CREATE INDEX "heat_program_control_check_org_idx" ON "heat_program_control_check" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "integration_roster_snapshot_org_captured_idx" ON "integration_roster_snapshot" USING btree ("organization_id","captured_at");--> statement-breakpoint
CREATE INDEX "scim_group_member_org_group_idx" ON "scim_group_member" USING btree ("organization_id","idp_group_id");