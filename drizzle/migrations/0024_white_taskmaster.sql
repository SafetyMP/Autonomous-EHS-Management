CREATE TABLE "context_sync_agent_class_claim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"agent_class" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "context_sync_agent_class_claim_org_user_class_uq" UNIQUE("organization_id","user_id","agent_class")
);
--> statement-breakpoint
ALTER TABLE "context_sync_agent_class_claim" ADD CONSTRAINT "context_sync_agent_class_claim_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_sync_agent_class_claim" ADD CONSTRAINT "context_sync_agent_class_claim_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "context_sync_agent_class_claim_org_idx" ON "context_sync_agent_class_claim" USING btree ("organization_id");