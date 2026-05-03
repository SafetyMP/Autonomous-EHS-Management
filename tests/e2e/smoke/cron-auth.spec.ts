import { expect, test } from "@playwright/test";

test.describe("cron reminders auth", () => {
  test("rejects unauthenticated requests", async ({ request }) => {
    const res = await request.get("/api/cron/reminders");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Unauthorized" });
  });
});
