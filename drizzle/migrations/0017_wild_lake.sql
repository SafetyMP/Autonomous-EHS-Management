CREATE TABLE "compliance_metric_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"establishment_id" uuid,
	"metric_key" varchar(64) NOT NULL,
	"calendar_year" integer NOT NULL,
	"formula_version" integer NOT NULL,
	"inputs_hash" varchar(64) NOT NULL,
	"inputs_json" jsonb NOT NULL,
	"result_json" jsonb NOT NULL,
	"computed_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mutation_idempotency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_user_id" text NOT NULL,
	"client_key" varchar(128) NOT NULL,
	"procedure" varchar(128) NOT NULL,
	"response_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mutation_idempotency_org_actor_client_uq" UNIQUE("organization_id","actor_user_id","client_key")
);
--> statement-breakpoint
ALTER TABLE "integration_event" ADD COLUMN "processing_status" varchar(24) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_event" ADD COLUMN "processing_error" text;--> statement-breakpoint
ALTER TABLE "integration_event" ADD COLUMN "applied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "compliance_metric_snapshot" ADD CONSTRAINT "compliance_metric_snapshot_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_metric_snapshot" ADD CONSTRAINT "compliance_metric_snapshot_establishment_id_establishment_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_metric_snapshot" ADD CONSTRAINT "compliance_metric_snapshot_computed_by_user_id_user_id_fk" FOREIGN KEY ("computed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutation_idempotency" ADD CONSTRAINT "mutation_idempotency_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutation_idempotency" ADD CONSTRAINT "mutation_idempotency_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "compliance_metric_snapshot_org_year_idx" ON "compliance_metric_snapshot" USING btree ("organization_id","calendar_year","metric_key");--> statement-breakpoint
CREATE INDEX "mutation_idempotency_org_created_idx" ON "mutation_idempotency" USING btree ("organization_id","created_at");