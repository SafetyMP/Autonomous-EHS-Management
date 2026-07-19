import { expect, test } from "@playwright/test";

/**
 * SCIM Users list requires org SCIM bearer. Anonymous must fail closed (R-010).
 */
test.describe("SCIM auth gate (@smoke)", () => {
  test("@smoke rejects anonymous SCIM Users list", async ({ request }) => {
    const res = await request.get("/api/scim/v2/Users");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/Missing or invalid Bearer token|Unauthorized/i);
  });
});
