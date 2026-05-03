import { describe, expect, it } from "vitest";
import { auditTrailRowsToCsv } from "@/lib/analytics/auditTrailCsv";

describe("auditTrailRowsToCsv", () => {
  it("includes header and escapes quotes in payload JSON", () => {
    const csv = auditTrailRowsToCsv([
      {
        id: "a",
        organizationId: "o",
        createdAtIso: "2025-01-01T00:00:00.000Z",
        action: "x",
        entityType: "e",
        entityId: "i",
        actorUserId: null,
        actorName: 'Na"me',
        actorEmail: null,
        payloadJson: '{"k":"v"}',
      },
    ]);
    expect(csv.split("\n")[0]).toBe(
      "id,organizationId,createdAtIso,action,entityType,entityId,actorUserId,actorName,actorEmail,payloadJson",
    );
    expect(csv).toContain('""');
    expect(csv).toContain("payloadJson");
  });
});
