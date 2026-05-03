CREATE TYPE "public"."osha_record_determination_status" AS ENUM('draft', 'under_review', 'determined');--> statement-breakpoint
CREATE TYPE "public"."osha_recordkeeping_framework" AS ENUM('federal_29_cfr_1904', 'state_plan', 'state_statute_supplement', 'undetermined');--> statement-breakpoint
ALTER TABLE "work_related_injury_illness_record" ADD COLUMN "recordkeeping_framework" "osha_recordkeeping_framework" DEFAULT 'undetermined' NOT NULL;--> statement-breakpoint
ALTER TABLE "work_related_injury_illness_record" ADD COLUMN "recordkeeping_state_code" varchar(2);--> statement-breakpoint
ALTER TABLE "work_related_injury_illness_record" ADD COLUMN "state_rule_reference" varchar(512);--> statement-breakpoint
ALTER TABLE "work_related_injury_illness_record" ADD COLUMN "jurisdiction_notes" text;--> statement-breakpoint
ALTER TABLE "work_related_injury_illness_record" ADD COLUMN "determination_status" "osha_record_determination_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "work_related_injury_illness_record" ADD COLUMN "classification_rationale" text;--> statement-breakpoint
ALTER TABLE "work_related_injury_illness_record" ADD COLUMN "work_related_rationale" text;--> statement-breakpoint
ALTER TABLE "work_related_injury_illness_record" ADD COLUMN "phcp_determination_summary" text;--> statement-breakpoint
ALTER TABLE "work_related_injury_illness_record" ADD COLUMN "determined_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "work_related_injury_illness_record" ADD COLUMN "determined_by_user_id" text;--> statement-breakpoint
ALTER TABLE "work_related_injury_illness_record" ADD CONSTRAINT "work_related_injury_illness_record_determined_by_user_id_user_id_fk" FOREIGN KEY ("determined_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;