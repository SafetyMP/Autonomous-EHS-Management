import { z } from "zod";

export const rosterSnapshotWorkerSchema = z.object({
  workerEmail: z.string().email(),
  externalWorkerId: z.string().max(128).optional().nullable(),
});

export type RosterSnapshotWorker = z.infer<typeof rosterSnapshotWorkerSchema>;

export const rosterSnapshotInboundSchema = z.object({
  kind: z.literal("roster_snapshot"),
  organizationId: z.string().uuid(),
  source: z.string().min(1).max(64).optional(),
  workers: z.array(rosterSnapshotWorkerSchema).min(1).max(10_000),
  idempotencyKey: z.string().min(1).max(256).optional(),
});
