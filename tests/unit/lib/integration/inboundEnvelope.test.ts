import { describe, expect, it } from "vitest";
import {
  inboundIdempotencyKeyFromPayload,
  parseIntegrationInboundPayload,
  trainingIngestInputFromInbound,
} from "@/lib/integration/inboundEnvelope";

describe("parseIntegrationInboundPayload", () => {
  it("accepts explicit training_completion kind", () => {
    const raw = {
      kind: "training_completion" as const,
      organizationId: "00000000-0000-4000-8000-000000000001",
      externalWorkerId: "ext-1",
      courseCode: "LOTO101",
      completedAt: "2026-01-15T12:00:00.000Z",
      issuer: "lms",
    };
    const p = parseIntegrationInboundPayload(raw);
    expect(p.success).toBe(true);
    if (!p.success) return;
    expect(p.data.kind).toBe("training_completion");
    if (p.data.kind !== "training_completion") return;
    const t = trainingIngestInputFromInbound(p.data);
    expect(t.courseCode).toBe("LOTO101");
  });

  it("accepts legacy LMS body without kind", () => {
    const raw = {
      organizationId: "00000000-0000-4000-8000-000000000001",
      externalWorkerId: "ext-1",
      courseCode: "LOTO101",
      completedAt: "2026-01-15T12:00:00.000Z",
      issuer: "lms",
    };
    const p = parseIntegrationInboundPayload(raw);
    expect(p.success).toBe(true);
    if (!p.success) return;
    expect(p.data.kind).toBe("training_completion");
  });

  it("accepts hris_membership_sync", () => {
    const raw = {
      kind: "hris_membership_sync" as const,
      organizationId: "00000000-0000-4000-8000-000000000001",
      workerEmail: "Worker@Example.com",
      siteId: "00000000-0000-4000-8000-000000000002",
    };
    const p = parseIntegrationInboundPayload(raw);
    expect(p.success).toBe(true);
  });

  it("parses legacy LMS idempotency key", () => {
    const raw = {
      organizationId: "00000000-0000-4000-8000-000000000001",
      externalWorkerId: "ext-1",
      courseCode: "LOTO101",
      completedAt: "2026-01-15T12:00:00.000Z",
      issuer: "lms",
      idempotencyKey: "  batch-ledger-001  ",
    };
    const p = parseIntegrationInboundPayload(raw);
    expect(p.success).toBe(true);
    if (!p.success) return;
    expect(inboundIdempotencyKeyFromPayload(p.data)).toBe("batch-ledger-001");
  });

  it("maps training ingestion input with idempotency key", () => {
    const p = parseIntegrationInboundPayload({
      kind: "training_completion",
      organizationId: "00000000-0000-4000-8000-000000000001",
      externalWorkerId: "ext-1",
      courseCode: "LOTO101",
      completedAt: "2026-01-15T12:00:00.000Z",
      issuer: "lms",
      idempotencyKey: "k1",
    });
    expect(p.success).toBe(true);
    if (!p.success || p.data.kind !== "training_completion") return;
    expect(trainingIngestInputFromInbound(p.data).idempotencyKey).toBe("k1");
  });
});
