CREATE TYPE "public"."ehs_evidence_entity_type" AS ENUM('incident', 'corrective_action');--> statement-breakpoint
CREATE TABLE "ehs_evidence_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" "ehs_evidence_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"file_name" varchar(512) NOT NULL,
	"mime_type" varchar(256) NOT NULL,
	"byte_size" integer NOT NULL,
	"storage_uri" text NOT NULL,
	"sha256_hex" varchar(64),
	"uploaded_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "corrective_action" ADD COLUMN "verification_performed_by_user_id" text;--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "rca_five_whys" jsonb;--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "contributing_factors" jsonb;--> statement-breakpoint
ALTER TABLE "ehs_evidence_attachment" ADD CONSTRAINT "ehs_evidence_attachment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ehs_evidence_attachment" ADD CONSTRAINT "ehs_evidence_attachment_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ehs_evidence_org_entity_idx" ON "ehs_evidence_attachment" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
ALTER TABLE "corrective_action" ADD CONSTRAINT "corrective_action_verification_performed_by_user_id_user_id_fk" FOREIGN KEY ("verification_performed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;