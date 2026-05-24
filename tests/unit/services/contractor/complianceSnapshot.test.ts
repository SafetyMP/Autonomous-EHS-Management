import { describe, expect, it } from "vitest";
import { fetchContractorComplianceCounts } from "@/server/services/contractor/complianceSnapshot";
import { externalParty, externalPartyCredential } from "@/server/db/schema";
import type { Db } from "@/server/db";

const orgId = "00000000-0000-4000-8000-000000000001";
const now = new Date("2026-05-24T12:00:00.000Z");

function fakeDb(creds: { validTo: Date | null; status: string }[], partyCount: number): Db {
  return {
    select() {
      return {
        from(table: unknown) {
          if (table === externalPartyCredential) {
            return {
              where: async () => creds,
            };
          }
          if (table === externalParty) {
            return {
              where: async () => [{ n: partyCount }],
            };
          }
          throw new Error("unexpected table");
        },
      };
    },
  } as unknown as Db;
}

describe("fetchContractorComplianceCounts", () => {
  it("counts expired, due soon, and active credentials", async () => {
    const counts = await fetchContractorComplianceCounts(
      fakeDb(
        [
          { validTo: new Date("2026-05-01T00:00:00.000Z"), status: "active" },
          { validTo: new Date("2026-06-01T00:00:00.000Z"), status: "active" },
          { validTo: new Date("2026-12-01T00:00:00.000Z"), status: "active" },
          { validTo: new Date("2026-06-15T00:00:00.000Z"), status: "rejected" },
        ],
        2,
      ),
      orgId,
      now,
    );
    expect(counts.credentialsExpired).toBe(1);
    expect(counts.credentialsDueSoon30d).toBe(1);
    expect(counts.credentialsActive).toBe(1);
    expect(counts.renewalAttentionCount).toBe(2);
    expect(counts.externalPartyCount).toBe(2);
  });
});
