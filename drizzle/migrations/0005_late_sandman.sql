CREATE TYPE "public"."data_retention_action" AS ENUM('hold', 'anonymize', 'delete');--> statement-breakpoint
CREATE TYPE "public"."data_retention_record_class" AS ENUM('incident_general', 'osha_record', 'gdpr_personal_data', 'controlled_document');--> statement-breakpoint
CREATE TYPE "public"."injury_illness_category" AS ENUM('injury', 'skin_disorder', 'respiratory_condition', 'poisoning', 'hearing_loss', 'other_illness');--> statement-breakpoint
CREATE TYPE "public"."osha_recordable_classification" AS ENUM('death', 'days_away', 'job_transfer_restriction', 'other_recordable');--> statement-breakpoint
CREATE TABLE "data_lifecycle_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" varchar(128) NOT NULL,
	"records_affected" integer DEFAULT 0 NOT NULL,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "data_retention_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"jurisdiction" varchar(64) NOT NULL,
	"record_class" "data_retention_record_class" NOT NULL,
	"minimum_years" integer NOT NULL,
	"action" "data_retention_action" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_retention_policy_uniq" UNIQUE("organization_id","jurisdiction","record_class")
);
--> statement-breakpoint
CREATE TABLE "establishment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid,
	"name" varchar(256) NOT NULL,
	"address_line_1" varchar(512),
	"city" varchar(128),
	"region" varchar(128),
	"postal_code" varchar(32),
	"country" varchar(2),
	"naics_code" varchar(6),
	"epa_facility_id" varchar(64),
	"state_facility_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "establishment_year_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"establishment_id" uuid NOT NULL,
	"calendar_year" integer NOT NULL,
	"avg_employees" integer,
	"total_hours_worked" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "establishment_year_metrics_uniq" UNIQUE("establishment_id","calendar_year")
);
--> statement-breakpoint
CREATE TABLE "facility_chemical_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"establishment_id" uuid NOT NULL,
	"regulatory_chemical_id" uuid NOT NULL,
	"reporting_year" integer NOT NULL,
	"max_amount" double precision NOT NULL,
	"amount_unit" varchar(32) NOT NULL,
	"storage_types" jsonb NOT NULL,
	"safety_data_sheet_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facility_chemical_inventory_uniq" UNIQUE("establishment_id","regulatory_chemical_id","reporting_year")
);
--> statement-breakpoint
CREATE TABLE "person_subject" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"display_pseudonym" varchar(64) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regulatory_chemical" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"cas_number" varchar(32),
	"alternate_id" varchar(128),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_data_sheet_ref" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"regulatory_chemical_id" uuid,
	"title" varchar(512) NOT NULL,
	"revision" varchar(64),
	"storage_url" varchar(2048),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_related_injury_illness_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"incident_id" uuid NOT NULL,
	"establishment_id" uuid,
	"injured_person_subject_id" uuid,
	"osha_recordable" boolean DEFAULT false NOT NULL,
	"recordable_classification" "osha_recordable_classification",
	"days_away" integer,
	"days_restricted" integer,
	"case_number_establishment" varchar(64),
	"privacy_case" boolean DEFAULT false NOT NULL,
	"job_title" varchar(256),
	"date_hired" timestamp with time zone,
	"injury_illness_category" "injury_illness_category",
	"body_part" text,
	"object_substance" text,
	"physician_facility_note" text,
	"supplementary_details_ciphertext" text,
	"retain_until" timestamp with time zone,
	"legal_hold" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_related_injury_illness_record_incident_uniq" UNIQUE("incident_id")
);
--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "legal_hold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "retain_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "anonymized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "pseudonym_id" varchar(64);--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD COLUMN "inherent_rating" "risk_rating";--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD COLUMN "likelihood_score" integer;--> statement-breakpoint
ALTER TABLE "risk_assessment" ADD COLUMN "consequence_score" integer;--> statement-breakpoint
ALTER TABLE "data_retention_policy" ADD CONSTRAINT "data_retention_policy_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "establishment" ADD CONSTRAINT "establishment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "establishment" ADD CONSTRAINT "establishment_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "establishment_year_metrics" ADD CONSTRAINT "establishment_year_metrics_establishment_id_establishment_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_chemical_inventory" ADD CONSTRAINT "facility_chemical_inventory_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_chemical_inventory" ADD CONSTRAINT "facility_chemical_inventory_establishment_id_establishment_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_chemical_inventory" ADD CONSTRAINT "facility_chemical_inventory_regulatory_chemical_id_regulatory_chemical_id_fk" FOREIGN KEY ("regulatory_chemical_id") REFERENCES "public"."regulatory_chemical"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_chemical_inventory" ADD CONSTRAINT "facility_chemical_inventory_safety_data_sheet_id_safety_data_sheet_ref_id_fk" FOREIGN KEY ("safety_data_sheet_id") REFERENCES "public"."safety_data_sheet_ref"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_subject" ADD CONSTRAINT "person_subject_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulatory_chemical" ADD CONSTRAINT "regulatory_chemical_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_data_sheet_ref" ADD CONSTRAINT "safety_data_sheet_ref_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_data_sheet_ref" ADD CONSTRAINT "safety_data_sheet_ref_regulatory_chemical_id_regulatory_chemical_id_fk" FOREIGN KEY ("regulatory_chemical_id") REFERENCES "public"."regulatory_chemical"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_related_injury_illness_record" ADD CONSTRAINT "work_related_injury_illness_record_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_related_injury_illness_record" ADD CONSTRAINT "work_related_injury_illness_record_incident_id_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incident"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_related_injury_illness_record" ADD CONSTRAINT "work_related_injury_illness_record_establishment_id_establishment_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_related_injury_illness_record" ADD CONSTRAINT "work_related_injury_illness_record_injured_person_subject_id_person_subject_id_fk" FOREIGN KEY ("injured_person_subject_id") REFERENCES "public"."person_subject"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "regulatory_chemical_org_cas_idx" ON "regulatory_chemical" USING btree ("organization_id","cas_number");--> statement-breakpoint
CREATE INDEX "incident_retention_cron_idx" ON "incident" USING btree ("organization_id","legal_hold","retain_until","anonymized_at");--> statement-breakpoint
