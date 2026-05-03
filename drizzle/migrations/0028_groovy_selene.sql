CREATE TABLE "establishment_month_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"establishment_id" uuid NOT NULL,
	"calendar_year" integer NOT NULL,
	"calendar_month" integer NOT NULL,
	"hours_worked" integer,
	"avg_employees" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "establishment_month_metrics_uniq" UNIQUE("establishment_id","calendar_year","calendar_month")
);
--> statement-breakpoint
ALTER TABLE "establishment_month_metrics" ADD CONSTRAINT "establishment_month_metrics_establishment_id_establishment_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishment"("id") ON DELETE cascade ON UPDATE no action;