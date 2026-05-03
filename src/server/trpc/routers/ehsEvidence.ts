import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  correctiveAction,
  ehsEvidenceAttachment,
  ehsEvidenceEntityTypeEnum,
  incident,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { protectedMutation, protectedProcedure, router } from "../init";
import { orgScope } from "../schemas/orgScope";

type EhsEvidenceEntityType =
  (typeof ehsEvidenceEntityTypeEnum.enumValues)[number];
const entityTypes = ehsEvidenceEntityTypeEnum.enumValues as [
  EhsEvidenceEntityType,
  ...EhsEvidenceEntityType[],
];

export const ehsEvidenceRouter = router({
  list: protectedProcedure
    .input(
      orgScope.extend({
        entityType: z.enum(entityTypes),
        entityId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.entityType === "incident") {
        await assertPermission(
          ctx.db,
          ctx.user.id,
          input.organizationId,
          PERMISSIONS.INCIDENT_READ,
        );
      } else {
        await assertPermission(
          ctx.db,
          ctx.user.id,
          input.organizationId,
          PERMISSIONS.CAPA_READ,
        );
      }

      return ctx.db
        .select()
        .from(ehsEvidenceAttachment)
        .where(
          and(
            eq(ehsEvidenceAttachment.organizationId, input.organizationId),
            eq(ehsEvidenceAttachment.entityType, input.entityType),
            eq(ehsEvidenceAttachment.entityId, input.entityId),
          ),
        )
        .orderBy(desc(ehsEvidenceAttachment.createdAt));
    }),

  register: protectedMutation
    .input(
      orgScope.extend({
        entityType: z.enum(entityTypes),
        entityId: z.string().uuid(),
        fileName: z.string().min(1).max(512),
        mimeType: z.string().min(1).max(256),
        byteSize: z.number().int().min(1).max(512 * 1024 * 1024),
        storageUri: z.string().min(1).max(4000),
        sha256Hex: z.string().length(64).regex(/^[a-f0-9]+$/i).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.entityType === "incident") {
        await assertPermission(
          ctx.db,
          ctx.user.id,
          input.organizationId,
          PERMISSIONS.INCIDENT_UPDATE,
        );
        const [i] = await ctx.db
          .select({ id: incident.id })
          .from(incident)
          .where(
            and(eq(incident.id, input.entityId), eq(incident.organizationId, input.organizationId)),
          )
          .limit(1);
        if (!i) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
        }
      } else {
        await assertPermission(
          ctx.db,
          ctx.user.id,
          input.organizationId,
          PERMISSIONS.CAPA_UPDATE,
        );
        const [c] = await ctx.db
          .select({ id: correctiveAction.id })
          .from(correctiveAction)
          .where(
            and(
              eq(correctiveAction.id, input.entityId),
              eq(correctiveAction.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!c) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Corrective action not found." });
        }
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(ehsEvidenceAttachment)
          .values({
            organizationId: input.organizationId,
            entityType: input.entityType as (typeof ehsEvidenceEntityTypeEnum.enumValues)[number],
            entityId: input.entityId,
            fileName: input.fileName,
            mimeType: input.mimeType,
            byteSize: input.byteSize,
            storageUri: input.storageUri,
            sha256Hex: input.sha256Hex ?? null,
            uploadedByUserId: ctx.user.id,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to register evidence.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "ehs_evidence.register",
          entityType: `ehs_evidence:${input.entityType}`,
          entityId: row.id,
          payload: {
            parentEntityId: input.entityId,
            fileName: input.fileName,
            byteSize: input.byteSize,
          },
        });

        return row;
      });
    }),
});
