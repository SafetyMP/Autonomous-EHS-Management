import { z } from "zod";

/** Stable snake_case IDs for Ishikawa categories (do not rename without a data migration). */
export const RCA_FISHBONE_CATEGORY_IDS = [
  "people",
  "process",
  "equipment",
  "materials",
  "environment",
  "management",
] as const;

export type RcaFishboneCategoryId = (typeof RCA_FISHBONE_CATEGORY_IDS)[number];

export type RcaFishboneBranch = {
  categoryId: RcaFishboneCategoryId;
  causes: string[];
};

export const RCA_FISHBONE_LABELS: Record<RcaFishboneCategoryId, string> = {
  people: "People",
  process: "Process",
  equipment: "Equipment",
  materials: "Materials",
  environment: "Environment",
  management: "Management",
};

export const rcaFishboneCategoryIdSchema = z.enum(RCA_FISHBONE_CATEGORY_IDS);

const rcaFishboneBranchSchema = z.object({
  categoryId: rcaFishboneCategoryIdSchema,
  causes: z.array(z.string().max(500)).max(12),
});

/** Branches submitted from the client (0–6 unique categories). */
export const rcaFishboneInputSchema = z
  .array(rcaFishboneBranchSchema)
  .max(RCA_FISHBONE_CATEGORY_IDS.length)
  .superRefine((arr, ctx) => {
    const ids = arr.map((b) => b.categoryId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each fishbone category may appear once.",
        path: [],
      });
    }
  });

/** Persisted shape: all six categories in canonical order. */
export function normalizeRcaFishboneForStore(
  input: RcaFishboneBranch[],
): RcaFishboneBranch[] {
  const map = new Map<RcaFishboneCategoryId, string[]>();
  for (const id of RCA_FISHBONE_CATEGORY_IDS) {
    map.set(id, []);
  }
  for (const row of input) {
    const trimmed = row.causes.map((c) => c.trim()).filter(Boolean).slice(0, 12);
    map.set(row.categoryId, trimmed);
  }
  return RCA_FISHBONE_CATEGORY_IDS.map((categoryId) => ({
    categoryId,
    causes: map.get(categoryId) ?? [],
  }));
}
