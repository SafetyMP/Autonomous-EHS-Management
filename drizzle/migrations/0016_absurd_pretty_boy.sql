ALTER TYPE "public"."data_retention_record_class" ADD VALUE 'safety_observation_program';--> statement-breakpoint
ALTER TYPE "public"."data_retention_record_class" ADD VALUE 'work_permit_program';--> statement-breakpoint
ALTER TABLE "safety_observation" ADD COLUMN "retain_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "safety_observation" ADD COLUMN "legal_hold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "safety_observation" ADD COLUMN "anonymized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "work_permit" ADD COLUMN "retain_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "work_permit" ADD COLUMN "legal_hold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "work_permit" ADD COLUMN "anonymized_at" timestamp with time zone;