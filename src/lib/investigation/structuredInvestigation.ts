import { z } from "zod";

export const bowTieBarrierOutcomeEnum = ["effective", "failed_degraded", "unknown"] as const;
export type BowTieBarrierOutcome = (typeof bowTieBarrierOutcomeEnum)[number];

const bowTieBarrierSchema = z.object({
  description: z.string().max(500),
  outcome: z.enum(bowTieBarrierOutcomeEnum),
});

const bowTieThreatSchema = z.object({
  description: z.string().max(2000),
  preventiveBarriers: z.array(bowTieBarrierSchema).max(20),
});

const bowTieConsequenceSchema = z.object({
  description: z.string().max(2000),
  mitigativeBarriers: z.array(bowTieBarrierSchema).max(20),
});

export const investigationBowTieInputSchema = z.object({
  topEvent: z.string().max(2000),
  threats: z.array(bowTieThreatSchema).max(15),
  consequences: z.array(bowTieConsequenceSchema).max(15),
  notes: z.string().max(8000).optional().nullable(),
});

export type InvestigationBowTieInput = z.infer<typeof investigationBowTieInputSchema>;

export const investigationBowTieUpdateSchema = z
  .union([investigationBowTieInputSchema, z.null()])
  .optional();
export type InvestigationBowTieStored = {
  topEvent: string;
  threats: {
    description: string;
    preventiveBarriers: { description: string; outcome: BowTieBarrierOutcome }[];
  }[];
  consequences: {
    description: string;
    mitigativeBarriers: { description: string; outcome: BowTieBarrierOutcome }[];
  }[];
  notes: string | null;
};

export function normalizeInvestigationBowTieForStore(
  input: InvestigationBowTieInput,
): InvestigationBowTieStored {
  const topEvent = input.topEvent.trim();
  const threats = input.threats
    .map((t) => ({
      description: t.description.trim(),
      preventiveBarriers: t.preventiveBarriers
        .map((b) => ({
          description: b.description.trim(),
          outcome: b.outcome,
        }))
        .filter((b) => b.description.length > 0),
    }))
    .filter((t) => t.description.length > 0);
  const consequences = input.consequences
    .map((c) => ({
      description: c.description.trim(),
      mitigativeBarriers: c.mitigativeBarriers
        .map((b) => ({
          description: b.description.trim(),
          outcome: b.outcome,
        }))
        .filter((b) => b.description.length > 0),
    }))
    .filter((c) => c.description.length > 0);
  const notes =
    input.notes == null || input.notes.trim().length === 0 ? null : input.notes.trim();
  return {
    topEvent,
    threats,
    consequences,
    notes,
  };
}

/** Persist `null` when there is no substantive bow-tie content. */
export function finalizeInvestigationBowTieForStore(
  input: InvestigationBowTieInput | null,
): InvestigationBowTieStored | null {
  if (input === null) return null;
  const n = normalizeInvestigationBowTieForStore(input);
  if (
    !n.topEvent &&
    n.threats.length === 0 &&
    n.consequences.length === 0 &&
    !n.notes
  ) {
    return null;
  }
  return n;
}

const chronologyStepSchema = z.object({
  sortOrder: z.number().int().min(0).max(9999),
  occurredAt: z.coerce.date().optional().nullable(),
  description: z.string().max(4000),
});

export const investigationChronologyStepsSchema = z
  .array(chronologyStepSchema)
  .max(50)
  .superRefine((arr, ctx) => {
    const orders = arr.map((s) => s.sortOrder);
    if (new Set(orders).size !== orders.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Event sequence sortOrder values must be unique.",
        path: [],
      });
    }
  });

export type InvestigationChronologyInput = z.infer<typeof investigationChronologyStepsSchema>;

/** Router: omit = no change; null = clear; array = replace. */
export const investigationChronologyUpdateSchema = z
  .union([investigationChronologyStepsSchema, z.null()])
  .optional();
export type InvestigationChronologyStepStored = {
  sortOrder: number;
  occurredAt: Date | null;
  description: string;
};

export function normalizeInvestigationChronologyForStore(
  input: InvestigationChronologyInput,
): InvestigationChronologyStepStored[] {
  const trimmed = input
    .map((s) => ({
      sortOrder: s.sortOrder,
      occurredAt: s.occurredAt ?? null,
      description: s.description.trim(),
    }))
    .filter((s) => s.description.length > 0);
  trimmed.sort((a, b) => a.sortOrder - b.sortOrder);
  return trimmed.map((s, idx) => ({
    sortOrder: idx,
    occurredAt: s.occurredAt,
    description: s.description,
  }));
}

export function finalizeInvestigationChronologyForStore(
  input: InvestigationChronologyInput | null,
): InvestigationChronologyStepStored[] | null {
  if (input === null) return null;
  const n = normalizeInvestigationChronologyForStore(input);
  return n.length === 0 ? null : n;
}

export const causalFactorCategoryEnum = [
  "human",
  "equipment",
  "procedural",
  "organizational",
  "external",
  "other",
] as const;
export type CausalFactorCategory = (typeof causalFactorCategoryEnum)[number];

const causalFactorRowSchema = z.object({
  summary: z.string().max(1000),
  category: z.enum(causalFactorCategoryEnum).optional().nullable(),
  barriersFailed: z.array(z.string().max(500)).max(10).optional(),
});

export const investigationCausalFactorsRowsSchema = z.array(causalFactorRowSchema).max(30);

export type InvestigationCausalFactorsInput = z.infer<typeof investigationCausalFactorsRowsSchema>;

export const investigationCausalFactorsUpdateSchema = z
  .union([investigationCausalFactorsRowsSchema, z.null()])
  .optional();
export type InvestigationCausalFactorStored = {
  summary: string;
  category: CausalFactorCategory | null;
  barriersFailed: string[];
};

export function normalizeInvestigationCausalFactorsForStore(
  input: InvestigationCausalFactorsInput,
): InvestigationCausalFactorStored[] {
  return input
    .map((r) => ({
      summary: r.summary.trim(),
      category: r.category ?? null,
      barriersFailed: (r.barriersFailed ?? [])
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10),
    }))
    .filter((r) => r.summary.length > 0);
}

export function finalizeInvestigationCausalFactorsForStore(
  input: InvestigationCausalFactorsInput | null,
): InvestigationCausalFactorStored[] | null {
  if (input === null) return null;
  const n = normalizeInvestigationCausalFactorsForStore(input);
  return n.length === 0 ? null : n;
}
