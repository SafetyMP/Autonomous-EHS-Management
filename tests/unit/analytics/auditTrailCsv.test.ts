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

  it("prefixes formula-like cells to block spreadsheet injection", () => {
    const csv = auditTrailRowsToCsv([
      {
        id: "a",
        organizationId: "o",
        createdAtIso: "2025-01-01T00:00:00.000Z",
        action: "=cmd|'/C calc'!A0",
        entityType: "+1",
        entityId: "-2",
        actorUserId: null,
        actorName: "@evil",
        actorEmail: null,
        payloadJson: "",
      },
    ]);
    expect(csv).toContain("'=cmd|'/C calc'!A0");
    expect(csv).toContain("'+1");
    expect(csv).toContain("'-2");
    expect(csv).toContain("'@evil");
  });
});
