import { z } from "zod";

export const hrisContractorSyncSchema = z.object({
  organizationId: z.string().uuid(),
  externalWorkerId: z.string().min(1).max(128),
  companyName: z.string().min(1).max(512),
  contactName: z.string().min(1).max(256).optional().nullable(),
  contactEmail: z.string().email().max(320).optional().nullable(),
  siteId: z.string().uuid().optional().nullable(),
  partyType: z.enum(["contractor", "visitor", "temporary_worker"]).default("contractor"),
  hrisSource: z.string().min(1).max(64).optional().nullable(),
  employmentStatus: z.enum(["active", "terminated", "leave"]).optional().nullable(),
  idempotencyKey: z.string().min(1).max(256).optional(),
});

export type HrisContractorSyncInput = z.infer<typeof hrisContractorSyncSchema>;
