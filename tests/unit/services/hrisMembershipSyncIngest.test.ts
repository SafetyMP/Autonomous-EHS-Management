import { describe, expect, it } from "vitest";
import { hrisPayloadForIntegrationEvent } from "@/server/services/hrisMembershipSyncIngest";

describe("hrisPayloadForIntegrationEvent", () => {
  it("normalizes worker email in stored payload", () => {
    const payload = hrisPayloadForIntegrationEvent({
      organizationId: "00000000-0000-4000-8000-000000000001",
      workerEmail: "Worker@Example.COM",
      siteId: null,
      externalWorkerId: "WD-1",
      department: "Ops",
      jobTitle: "Tech",
      managerEmail: "boss@example.com",
      costCenter: "CC-1",
      employmentStatus: "leave",
    });
    expect(payload.workerEmail).toBe("worker@example.com");
    expect(payload.employmentStatus).toBe("leave");
  });
});
