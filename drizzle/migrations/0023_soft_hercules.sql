CREATE TYPE "public"."context_sync_prov_operation" AS ENUM('read', 'write');--> statement-breakpoint
CREATE TABLE "context_sync_actor" (
	"organization_id" uuid NOT NULL,
	"actor_id" varchar(256) NOT NULL,
	"actor_type" varchar(16) NOT NULL,
	"name" varchar(512) NOT NULL,
	"agent_class" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "context_sync_actor_organization_id_actor_id_pk" PRIMARY KEY("organization_id","actor_id")
);
--> statement-breakpoint
CREATE TABLE "context_sync_artifact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"uri" varchar(2048) NOT NULL,
	"domain_segment" varchar(128) NOT NULL,
	"artifact_path" varchar(1024) NOT NULL,
	"name" varchar(512) NOT NULL,
	"content_type" varchar(256) DEFAULT 'text/plain' NOT NULL,
	"head_version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "context_sync_artifact_uri_unique" UNIQUE("uri")
);
--> statement-breakpoint
CREATE TABLE "context_sync_artifact_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"content_sha256" varchar(64) NOT NULL,
	"summary" varchar(1024),
	"author_actor_id" varchar(256) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "context_sync_artifact_version_artifact_ver_uq" UNIQUE("artifact_id","version")
);
--> statement-breakpoint
CREATE TABLE "context_sync_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_id" varchar(256),
	"agent_class" varchar(128),
	"artifact_pattern" varchar(2048) NOT NULL,
	"operations" jsonb NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "context_sync_provenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_id" varchar(256) NOT NULL,
	"operation" "context_sync_prov_operation" NOT NULL,
	"artifact_uri" varchar(2048) NOT NULL,
	"version_touched" integer NOT NULL,
	"downstream_uri" varchar(2048),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "context_sync_actor" ADD CONSTRAINT "context_sync_actor_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_sync_artifact" ADD CONSTRAINT "context_sync_artifact_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_sync_artifact_version" ADD CONSTRAINT "context_sync_artifact_version_artifact_id_context_sync_artifact_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."context_sync_artifact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_sync_grant" ADD CONSTRAINT "context_sync_grant_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_sync_grant" ADD CONSTRAINT "context_sync_grant_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_sync_provenance" ADD CONSTRAINT "context_sync_provenance_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "context_sync_artifact_org_domain_idx" ON "context_sync_artifact" USING btree ("organization_id","domain_segment");--> statement-breakpoint
CREATE INDEX "context_sync_artifact_version_artifact_idx" ON "context_sync_artifact_version" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "context_sync_grant_org_idx" ON "context_sync_grant" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "context_sync_provenance_org_created_idx" ON "context_sync_provenance" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "context_sync_provenance_artifact_idx" ON "context_sync_provenance" USING btree ("artifact_uri");