CREATE TYPE "public"."membership_employment_status" AS ENUM('active', 'terminated', 'leave');--> statement-breakpoint
CREATE TYPE "public"."membership_lifecycle_status" AS ENUM('active', 'suspended');--> statement-breakpoint
ALTER TABLE "membership" ADD COLUMN "external_worker_id" varchar(128);--> statement-breakpoint
ALTER TABLE "membership" ADD COLUMN "department" varchar(256);--> statement-breakpoint
ALTER TABLE "membership" ADD COLUMN "job_title" varchar(256);--> statement-breakpoint
ALTER TABLE "membership" ADD COLUMN "manager_user_id" text;--> statement-breakpoint
ALTER TABLE "membership" ADD COLUMN "cost_center" varchar(128);--> statement-breakpoint
ALTER TABLE "membership" ADD COLUMN "employment_status" "membership_employment_status";--> statement-breakpoint
ALTER TABLE "membership" ADD COLUMN "lifecycle_status" "membership_lifecycle_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_manager_user_id_user_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;