CREATE TABLE "cron_job_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_key" varchar(64) NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"ok" boolean NOT NULL,
	"duration_ms" integer NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE INDEX "cron_job_run_job_started_idx" ON "cron_job_run" USING btree ("job_key","started_at");