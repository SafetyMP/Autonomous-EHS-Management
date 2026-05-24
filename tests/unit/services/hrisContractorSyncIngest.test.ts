import { describe, expect, it, vi } from "vitest";
import { applyHrisContractorSync } from "@/server/services/hrisContractorSyncIngest";
import * as auditModule from "@/server/services/audit";

describe("applyHrisContractorSync", () => {
  it("creates external_party when none exists", async () => {
    vi.spyOn(auditModule, "writeAuditLog").mockResolvedValue(undefined);

    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          returning: async () => [{ id: "party-1" }],
        }),
      }),
    };

    const result = await applyHrisContractorSync(
      db as never,
      {
        organizationId: "00000000-0000-4000-8000-000000000001",
        externalWorkerId: "VMS-C-4401",
        companyName: "Acme Industrial Services LLC",
        partyType: "contractor",
      },
      "event-1",
      "actor-1",
    );

    expect(result).toEqual({ externalPartyId: "party-1", created: true });
    expect(auditModule.writeAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "integration.hris_contractor_provision" }),
    );
  });
});
