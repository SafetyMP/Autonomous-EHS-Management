import { expect, test } from "@playwright/test";

/**
 * Requires a running dev server with DEMO_MODE + seeded demo user (e.g. `.env.local` from `.env.demo.example` after `npm run demo:up`).
 * Does not run in default CI (smoke uses @smoke grep).
 */
test.describe("demo quick login", () => {
  test("Try demo admin reaches dashboard", async ({ page }) => {
    test.skip(
      process.env.PLAYWRIGHT_DEMO !== "1",
      "Set PLAYWRIGHT_DEMO=1, run `npm run demo:up` then `npm run dev`, and re-run Playwright.",
    );

    await page.goto("/sign-in");
    await expect(
      page.getByRole("button", { name: /try demo admin/i }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /try demo admin/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    // Desk home: "Operations — {org}" or "Operations command center"; field home: "Field — {org}" or "Field workspace".
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /Operations —|Operations command center|Field —|Field workspace/,
      { timeout: 10_000 },
    );
  });
});
