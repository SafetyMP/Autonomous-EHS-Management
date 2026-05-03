ALTER TABLE "organization" ADD COLUMN "context_sync_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "organization" SET "context_sync_enabled" = true;--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "context_sync_enabled" SET DEFAULT false;