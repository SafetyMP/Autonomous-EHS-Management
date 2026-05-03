import { expect, test } from "@playwright/test";

test.describe("cron data-retention auth", () => {
  test("@smoke rejects unauthenticated requests", async ({ request }) => {
    const res = await request.get("/api/cron/data-retention");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Unauthorized" });
  });
});
