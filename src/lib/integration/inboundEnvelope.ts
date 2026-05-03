import { z } from "zod";
import { trainingCompletionIngestSchema } from "@/lib/integration/trainingCompletion";
import type { TrainingCompletionIngestInput } from "@/lib/integration/trainingCompletion";

export const hrisMembershipSyncSchema = z.object({
  organizationId: z.string().uuid(),
  /** Primary org contact email in HRIS; must match an existing Better Auth user. */
  workerEmail: z.string().email().max(320),
  siteId: z.string().uuid().optional().nullable(),
  /** Optional connector replay key — stored in `integration_inbound_idempotency`. */
  idempotencyKey: z.string().min(1).max(256).optional(),
});

export type HrisMembershipSyncInput = z.infer<typeof hrisMembershipSyncSchema>;

const inboundTraining = trainingCompletionIngestSchema.extend({
  kind: z.literal("training_completion"),
});

const inboundHris = hrisMembershipSyncSchema.extend({
  kind: z.literal("hris_membership_sync"),
});

export const integrationInboundSchema = z.discriminatedUnion("kind", [inboundTraining, inboundHris]);

export type IntegrationInboundPayload = z.infer<typeof integrationInboundSchema>;

export function trainingIngestInputFromInbound(
  data: Extract<IntegrationInboundPayload, { kind: "training_completion" }>,
): TrainingCompletionIngestInput {
  return {
    organizationId: data.organizationId,
    externalWorkerId: data.externalWorkerId,
    courseCode: data.courseCode,
    completedAt: data.completedAt,
    issuer: data.issuer,
    ...(data.idempotencyKey ? { idempotencyKey: data.idempotencyKey } : {}),
  };
}

export function hrisSyncInputFromInbound(
  data: Extract<IntegrationInboundPayload, { kind: "hris_membership_sync" }>,
): HrisMembershipSyncInput {
  return {
    organizationId: data.organizationId,
    workerEmail: data.workerEmail,
    siteId: data.siteId ?? null,
    ...(data.idempotencyKey ? { idempotencyKey: data.idempotencyKey } : {}),
  };
}

/** Replay key supplied by connectors on POST `/api/integration/inbound` (optional fields on both kinds). */
export function inboundIdempotencyKeyFromPayload(
  payload: IntegrationInboundPayload,
): string | undefined {
  const raw = payload.idempotencyKey?.trim();
  if (!raw) return undefined;
  return raw.slice(0, 512);
}

export function normalizeIntegrationEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Supports legacy LMS bodies without `kind` discriminator. */
export function parseIntegrationInboundPayload(raw: unknown):
  | { success: true; data: IntegrationInboundPayload }
  | { success: false; error: z.ZodError } {
  const asObj = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : null;
  if (asObj && asObj.kind === undefined && "externalWorkerId" in asObj) {
    const p = trainingCompletionIngestSchema.safeParse(raw);
    if (p.success) {
      return { success: true, data: { kind: "training_completion", ...p.data } };
    }
  }
  const parsed = integrationInboundSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }
  return { success: true, data: parsed.data };
}
