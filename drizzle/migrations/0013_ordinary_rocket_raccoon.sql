CREATE TYPE "public"."safety_observation_category" AS ENUM('positive_behavior', 'at_risk_behavior', 'unsafe_condition', 'other');--> statement-breakpoint
CREATE TYPE "public"."safety_observation_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."safety_observation_status" AS ENUM('open', 'acknowledged', 'closed');--> statement-breakpoint
CREATE TYPE "public"."work_permit_status" AS ENUM('draft', 'pending_approval', 'active', 'rejected', 'completed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."work_permit_type" AS ENUM('hot_work', 'confined_space', 'work_at_height', 'other');--> statement-breakpoint
ALTER TYPE "public"."approval_entity_type" ADD VALUE 'work_permit';--> statement-breakpoint
CREATE TABLE "safety_observation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"category" "safety_observation_category" DEFAULT 'other' NOT NULL,
	"severity" "safety_observation_severity" DEFAULT 'medium' NOT NULL,
	"summary" varchar(512) NOT NULL,
	"details" text,
	"status" "safety_observation_status" DEFAULT 'open' NOT NULL,
	"reporter_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"linked_corrective_action_id" uuid
);
--> statement-breakpoint
CREATE TABLE "work_permit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"site_id" uuid,
	"title" varchar(512) NOT NULL,
	"permit_type" "work_permit_type" DEFAULT 'other' NOT NULL,
	"status" "work_permit_status" DEFAULT 'draft' NOT NULL,
	"requester_user_id" text NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone NOT NULL,
	"work_summary" text NOT NULL,
	"hazards_controls" text,
	"approved_by_user_id" text,
	"approved_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "safety_observation" ADD CONSTRAINT "safety_observation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_observation" ADD CONSTRAINT "safety_observation_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_observation" ADD CONSTRAINT "safety_observation_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_observation" ADD CONSTRAINT "safety_observation_linked_corrective_action_id_corrective_action_id_fk" FOREIGN KEY ("linked_corrective_action_id") REFERENCES "public"."corrective_action"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_approved_by_user_id_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "safety_observation_org_status_idx" ON "safety_observation" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "safety_observation_org_observed_idx" ON "safety_observation" USING btree ("organization_id","observed_at");--> statement-breakpoint
CREATE INDEX "work_permit_org_status_idx" ON "work_permit" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "work_permit_org_valid_to_idx" ON "work_permit" USING btree ("organization_id","valid_to");