import { expect, test } from "@playwright/test";

/**
 * Inbound integration webhook requires Bearer INTEGRATION_INBOUND_SECRET.
 * CI exercises anon rejection without Postgres-dependent processing.
 */
test.describe("Integration inbound gate (@smoke)", () => {
  test("@smoke rejects anonymous POST to integration inbound", async ({ request }) => {
    const res = await request.post("/api/integration/inbound", {
      data: {
        kind: "hris_membership_sync",
        organizationId: "00000000-0000-4000-8000-000000000001",
        workerEmail: "worker@example.com",
      },
    });
    expect(res.status()).toBe(401);
  });
});
