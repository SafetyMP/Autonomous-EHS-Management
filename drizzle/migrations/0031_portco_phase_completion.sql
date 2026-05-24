ALTER TYPE "membership_lifecycle_status" ADD VALUE IF NOT EXISTS 'deprovisioned';--> statement-breakpoint
CREATE TABLE "scim_group_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"idp_group_id" varchar(256) NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scim_group_member_org_group_user_uq" UNIQUE("organization_id","idp_group_id","user_id")
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
ALTER TABLE "external_party" ADD COLUMN "external_worker_id" varchar(128);--> statement-breakpoint
ALTER TABLE "external_party" ADD COLUMN "hris_source" varchar(64);--> statement-breakpoint
ALTER TABLE "scim_group_member" ADD CONSTRAINT "scim_group_member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scim_group_member" ADD CONSTRAINT "scim_group_member_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_roster_snapshot" ADD CONSTRAINT "integration_roster_snapshot_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scim_group_member_org_group_idx" ON "scim_group_member" USING btree ("organization_id","idp_group_id");--> statement-breakpoint
CREATE INDEX "integration_roster_snapshot_org_captured_idx" ON "integration_roster_snapshot" USING btree ("organization_id","captured_at");
