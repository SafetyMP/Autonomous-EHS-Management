import { expect, test } from "@playwright/test";

/**
 * Context Sync REST requires Better Auth session + actor binding.
 * CI exercises anon rejection (and spoofed agent-class without session) without Postgres toggles.
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

  test("@smoke rejects anonymous spoofed X-Agent-Class / X-Actor-Id", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/contextsync/artifacts/list?org=00000000-0000-4000-8000-000000000001",
      {
        headers: {
          "X-Agent-Class": "spoofed-admin-agent",
          "X-Actor-Id": "human:00000000-0000-4000-8000-000000000099",
        },
      },
    );
    expect(res.status()).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      reason: "sign_in_required",
      error: "actor_required",
    });
  });
});
