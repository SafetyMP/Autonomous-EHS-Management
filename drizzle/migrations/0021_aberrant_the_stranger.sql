CREATE TABLE "integration_inbound_idempotency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"inbound_key" varchar(512) NOT NULL,
	"http_status" integer NOT NULL,
	"response_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_inbound_idempotency_org_key_uq" UNIQUE("organization_id","inbound_key")
);
--> statement-breakpoint
ALTER TABLE "integration_inbound_idempotency" ADD CONSTRAINT "integration_inbound_idempotency_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;