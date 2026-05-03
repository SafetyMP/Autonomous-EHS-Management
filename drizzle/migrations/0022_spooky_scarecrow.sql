CREATE TABLE "integration_connector_mapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connector_key" varchar(64) NOT NULL,
	"mapping_json" jsonb NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_connector_mapping_org_connector_uq" UNIQUE("organization_id","connector_key")
);
--> statement-breakpoint
CREATE TABLE "operational_webhook_endpoint" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"target_url" varchar(2048) NOT NULL,
	"secret" varchar(256),
	"subscribed_events" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_connector_mapping" ADD CONSTRAINT "integration_connector_mapping_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_webhook_endpoint" ADD CONSTRAINT "operational_webhook_endpoint_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integration_connector_mapping_org_idx" ON "integration_connector_mapping" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "operational_webhook_endpoint_org_idx" ON "operational_webhook_endpoint" USING btree ("organization_id");