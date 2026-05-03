import { z } from "zod";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { environmentalAspect, hazard } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, router } from "../init";

export const importDataRouter = router({
  importAspectsCsv: protectedMutation
    .input(
      orgScope.extend({
        csvText: z.string().min(1).max(500_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.ASPECT_CREATE);

      const lines = input.csvText.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        return { imported: 0, errors: ["CSV needs header + rows"] as string[] };
      }
      const header = lines[0]!.toLowerCase().split(",").map((s) => s.trim());
      const nameIdx = header.indexOf("name");
      if (nameIdx < 0) return { imported: 0, errors: ["Missing 'name' column"] as string[] };

      return ctx.db.transaction(async (tx) => {
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i]!.split(",").map((s) => s.trim());
          const name = cols[nameIdx];
          if (!name) continue;
          const actI = header.indexOf("activity");
          const descI = header.indexOf("description");
          await tx.insert(environmentalAspect).values({
            organizationId: input.organizationId,
            name,
            activity: actI >= 0 ? (cols[actI] ?? null) : null,
            description: descI >= 0 ? (cols[descI] ?? null) : null,
          });
          imported++;
        }
        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "import.aspects_csv",
          entityType: "environmental_aspect_batch",
          entityId: "batch",
          payload: { imported },
        });
        return { imported, errors: [] as string[] };
      });
    }),

  importHazardsCsv: protectedMutation
    .input(orgScope.extend({ csvText: z.string().min(1).max(500_000) }))
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.HAZARD_CREATE);
      const lines = input.csvText.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return { imported: 0, errors: ["CSV needs header + rows"] as string[] };
      const header = lines[0]!.toLowerCase().split(",").map((s) => s.trim());
      const titleIdx = header.indexOf("title");
      if (titleIdx < 0) return { imported: 0, errors: ["Missing 'title' column"] as string[] };

      return ctx.db.transaction(async (tx) => {
        let imported = 0;
        const descI = header.indexOf("description");
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i]!.split(",").map((s) => s.trim());
          const title = cols[titleIdx];
          if (!title) continue;
          await tx.insert(hazard).values({
            organizationId: input.organizationId,
            title,
            description: descI >= 0 ? (cols[descI] ?? null) : null,
          });
          imported++;
        }
        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "import.hazards_csv",
          entityType: "hazard_batch",
          entityId: "batch",
          payload: { imported },
        });
        return { imported, errors: [] as string[] };
      });
    }),
});
