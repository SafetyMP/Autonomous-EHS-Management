import { describe, expect, it } from "vitest";
import {
  redactTrainingCompletionForStorage,
  trainingCompletionIngestSchema,
} from "@/lib/integration/trainingCompletion";
import { parseTrainingCompletionPayload } from "@/server/services/trainingCompletionIngest";

describe("trainingCompletionIngestSchema", () => {
  it("accepts valid payloads", () => {
    const raw = {
      organizationId: "00000000-0000-4000-8000-000000000001",
      externalWorkerId: "vendor-worker-123",
      courseCode: "HSE-101",
      completedAt: "2026-05-01T00:00:00.000Z",
      issuer: "AcmeLMS",
    };
    const parsed = trainingCompletionIngestSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });

  it("parseTrainingCompletionPayload rejects invalid org id", () => {
    const r = parseTrainingCompletionPayload({
      organizationId: "not-a-uuid",
      externalWorkerId: "x",
      courseCode: "c",
      completedAt: new Date(),
      issuer: "i",
    });
    expect(r.success).toBe(false);
  });
});

describe("redactTrainingCompletionForStorage", () => {
  it("does not store raw externalWorkerId", () => {
    const row = redactTrainingCompletionForStorage({
      organizationId: "00000000-0000-4000-8000-000000000001",
      externalWorkerId: "secret-id",
      courseCode: "HSE-101",
      completedAt: new Date("2026-05-01"),
      issuer: "LMS",
    });
    expect(row.externalWorkerId).toContain("redacted");
    expect(String(row.externalWorkerId)).not.toContain("secret-id");
  });
});
