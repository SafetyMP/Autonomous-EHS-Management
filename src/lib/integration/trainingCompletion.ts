import { z } from "zod";

/** LMS webhook body — external worker id is an opaque vendor id (not necessarily a UUID). */
export const trainingCompletionIngestSchema = z.object({
  organizationId: z.string().uuid(),
  externalWorkerId: z.string().min(1).max(256),
  courseCode: z.string().min(1).max(128),
  completedAt: z.coerce.date(),
  issuer: z.string().min(1).max(128),
});

export type TrainingCompletionIngestInput = z.infer<typeof trainingCompletionIngestSchema>;

/** Strip obvious PII patterns from payloads stored on integration_event. */
export function redactTrainingCompletionForStorage(
  input: TrainingCompletionIngestInput,
): Record<string, unknown> {
  return {
    externalWorkerId: `[redacted:${input.externalWorkerId.length}chars]`,
    courseCode: input.courseCode,
    completedAt: input.completedAt.toISOString(),
    issuer: input.issuer,
  };
}
