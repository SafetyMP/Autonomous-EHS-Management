import { expect, test } from "@playwright/test";

/**
 * Context Sync REST requires Better Auth session + actor binding.
 * CI exercises anon rejection without Postgres-dependent toggles.
 */
test.describe("Context Sync REST gate (@smoke)", () => {
  test("@smoke rejects anonymous artifacts list", async ({ request }) => {
    const res = await request.get(
      "/api/contextsync/artifacts/list?org=00000000-0000-4000-8000-000000000001",
    );
    expect(res.status()).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      reason: "sign_in_required",
      error: "actor_required",
    });
  });
});
