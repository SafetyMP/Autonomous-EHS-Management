CREATE TABLE "oidc_jit_claim_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"claim_key" varchar(128) DEFAULT 'groups' NOT NULL,
	"match_value" varchar(256) NOT NULL,
	"role_slug" varchar(64) NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_scim_config" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"bearer_token_hash" varchar(64),
	"default_role_slug" varchar(64) DEFAULT 'supervisor' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scim_group_mapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"idp_group_id" varchar(256) NOT NULL,
	"idp_group_display_name" varchar(256),
	"role_slug" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scim_group_mapping_org_group_uq" UNIQUE("organization_id","idp_group_id")
);
--> statement-breakpoint
ALTER TABLE "oidc_jit_claim_rule" ADD CONSTRAINT "oidc_jit_claim_rule_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_scim_config" ADD CONSTRAINT "organization_scim_config_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scim_group_mapping" ADD CONSTRAINT "scim_group_mapping_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "oidc_jit_claim_rule_org_priority_idx" ON "oidc_jit_claim_rule" USING btree ("organization_id","priority");--> statement-breakpoint
CREATE INDEX "scim_group_mapping_org_idx" ON "scim_group_mapping" USING btree ("organization_id");