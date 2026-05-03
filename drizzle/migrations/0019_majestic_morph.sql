CREATE INDEX "audit_log_organization_created_idx" ON "audit_log" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_organization_entity_type_idx" ON "audit_log" USING btree ("organization_id","entity_type");--> statement-breakpoint
INSERT INTO "permission" ("key", "description")
VALUES ('audit_trail:read', 'audit_trail:read')
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permission" ("role_id", "permission_id")
SELECT "role"."id", "permission"."id"
FROM "role"
CROSS JOIN "permission"
WHERE "permission"."key" = 'audit_trail:read'
AND "role"."slug" = 'admin'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;