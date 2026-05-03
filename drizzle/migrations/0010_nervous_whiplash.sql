CREATE TYPE "public"."approval_entity_type" AS ENUM('capa', 'incident');--> statement-breakpoint
CREATE TYPE "public"."approval_request_status" AS ENUM('open', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."approval_step_status" AS ENUM('pending', 'approved', 'rejected', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."external_party_credential_kind" AS ENUM('insurance_coi', 'permit', 'training_proof', 'other');--> statement-breakpoint
CREATE TYPE "public"."external_party_credential_status" AS ENUM('pending_review', 'active', 'expired', 'rejected');--> statement-breakpoint
CREATE TABLE "approval_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" "approval_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"status" "approval_request_status" DEFAULT 'open' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"approver_user_id" text NOT NULL,
	"status" "approval_step_status" DEFAULT 'pending' NOT NULL,
	"comment" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_step_request_order_uniq" UNIQUE("request_id","step_order")
);
--> statement-breakpoint
CREATE TABLE "external_party_credential" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"external_party_id" uuid NOT NULL,
	"kind" "external_party_credential_kind" NOT NULL,
	"status" "external_party_credential_status" DEFAULT 'pending_review' NOT NULL,
	"identifier" varchar(512),
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"evidence_uri" varchar(2048),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_step" ADD CONSTRAINT "approval_step_request_id_approval_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."approval_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_step" ADD CONSTRAINT "approval_step_approver_user_id_user_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_party_credential" ADD CONSTRAINT "external_party_credential_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_party_credential" ADD CONSTRAINT "external_party_credential_external_party_id_external_party_id_fk" FOREIGN KEY ("external_party_id") REFERENCES "public"."external_party"("id") ON DELETE cascade ON UPDATE no action;