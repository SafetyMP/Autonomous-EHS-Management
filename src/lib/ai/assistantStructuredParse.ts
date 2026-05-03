import { z } from "zod";
import { INCIDENT_SEVERITIES, INCIDENT_TYPES } from "@/lib/ehs-enums";

const incidentSeverityZ = z.enum(
  INCIDENT_SEVERITIES as unknown as [(typeof INCIDENT_SEVERITIES)[number], ...(typeof INCIDENT_SEVERITIES)[number][]],
);
const incidentTypeZ = z.enum(
  INCIDENT_TYPES as unknown as [(typeof INCIDENT_TYPES)[number], ...(typeof INCIDENT_TYPES)[number][]],
);

/** Discriminated JSON steps from the bounded RAG assistant tool loop. */
export const assistantStepSchema = z.discriminatedUnion("step", [
  z.object({
    step: z.literal("rag_search"),
    query: z.string().min(2).max(512),
  }),
  z.object({
    step: z.literal("final"),
    summary: z.string().min(10).max(8000),
    citedChunkIds: z.array(z.string().uuid()).max(30).optional(),
  }),
]);

export type AssistantStep = z.infer<typeof assistantStepSchema>;

export function tryParseAssistantStep(raw: string): AssistantStep | null {
  try {
    const data: unknown = JSON.parse(raw);
    const parsed = assistantStepSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const observationIntakeDraftSchema = z.object({
  suggestedSummary: z.string().min(2).max(512),
  suggestedDetails: z.string().max(12_000).optional(),
  citedChunkIds: z.array(z.string().uuid()).max(20).optional(),
});

export type ObservationIntakeDraft = z.infer<typeof observationIntakeDraftSchema>;

/** Parses model JSON for observation intake draft; invalid JSON yields a failed safe-parse (same behavior as empty object). */
export function tryParseObservationIntakeDraft(raw: string) {
  try {
    const data: unknown = JSON.parse(raw);
    return observationIntakeDraftSchema.safeParse(data);
  } catch {
    return observationIntakeDraftSchema.safeParse({});
  }
}

export const incidentIntakeDraftSchema = z.object({
  suggestedTitle: z.string().min(2).max(500),
  suggestedDescription: z.string().min(2).max(12_000),
  suggestedImmediateActions: z.string().max(8000).optional(),
  suggestedSeverity: incidentSeverityZ.optional(),
  suggestedIncidentType: incidentTypeZ.optional(),
  citedChunkIds: z.array(z.string().uuid()).max(20).optional(),
});

export type IncidentIntakeDraft = z.infer<typeof incidentIntakeDraftSchema>;

export function tryParseIncidentIntakeDraft(raw: string) {
  try {
    const data: unknown = JSON.parse(raw);
    return incidentIntakeDraftSchema.safeParse(data);
  } catch {
    return incidentIntakeDraftSchema.safeParse({});
  }
}

const inspectionTypeDraftZ = z.enum(["routine", "regulatory", "pre_job", "other"]);
const permitTypeDraftZ = z.enum(["hot_work", "confined_space", "work_at_height", "other"]);

export const inspectionIntakeDraftSchema = z.object({
  suggestedTitle: z.string().min(2).max(500),
  suggestedNotes: z.string().max(12_000).optional(),
  suggestedInspectionType: inspectionTypeDraftZ.optional(),
  citedChunkIds: z.array(z.string().uuid()).max(20).optional(),
});

export type InspectionIntakeDraft = z.infer<typeof inspectionIntakeDraftSchema>;

export function tryParseInspectionIntakeDraft(raw: string) {
  try {
    const data: unknown = JSON.parse(raw);
    return inspectionIntakeDraftSchema.safeParse(data);
  } catch {
    return inspectionIntakeDraftSchema.safeParse({});
  }
}

export const permitIntakeDraftSchema = z.object({
  suggestedTitle: z.string().min(2).max(500),
  suggestedWorkSummary: z.string().min(2).max(12_000),
  suggestedHazardsControls: z.string().max(12_000).optional(),
  suggestedPermitType: permitTypeDraftZ.optional(),
  citedChunkIds: z.array(z.string().uuid()).max(20).optional(),
});

export type PermitIntakeDraft = z.infer<typeof permitIntakeDraftSchema>;

export function tryParsePermitIntakeDraft(raw: string) {
  try {
    const data: unknown = JSON.parse(raw);
    return permitIntakeDraftSchema.safeParse(data);
  } catch {
    return permitIntakeDraftSchema.safeParse({});
  }
}

export const capaIntakeDraftSchema = z.object({
  suggestedTitle: z.string().min(3).max(500),
  suggestedDetails: z.string().min(20).max(12_000),
  citedChunkIds: z.array(z.string().uuid()).max(20).optional(),
});

export type CapaIntakeDraft = z.infer<typeof capaIntakeDraftSchema>;

export function tryParseCapaIntakeDraft(raw: string) {
  try {
    const data: unknown = JSON.parse(raw);
    return capaIntakeDraftSchema.safeParse(data);
  } catch {
    return capaIntakeDraftSchema.safeParse({});
  }
}
