import { expect, test } from "@playwright/test";

/**
 * Richer assertions against `npm run db:seed:demo` fixtures. Not part of default CI.
 * Requires PLAYWRIGHT_DEMO=1, demo stack (`npm run demo:up`), `npm run dev` with demo `.env.local`.
 */
test.describe("demo fixture richness", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      process.env.PLAYWRIGHT_DEMO !== "1",
      "Set PLAYWRIGHT_DEMO=1, run `npm run demo:up` then `npm run dev` with migrated + seeded DB, and re-run Playwright.",
    );

    await page.goto("/sign-in");
    await page.getByRole("button", { name: /try demo admin/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test("environmental regulatory permits list includes demo discharge row", async ({ page }) => {
    await page.goto("/dashboard/environmental-permits");
    await expect(page.getByRole("link", { name: /Demo discharge permit/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("incident detail shows structured 5-Whys for seeded forklift near miss", async ({ page }) => {
    await page.goto("/dashboard/incidents");
    await page.getByRole("link", { name: /forklift swing at loading dock/i }).first().click();
    await expect(page.getByRole("heading", { name: /Structured 5-Whys/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("risk assessments roster includes task-based LOTO demo row", async ({ page }) => {
    await page.goto("/dashboard/risk-assessments");
    await expect(page.getByText(/LOTO verification — M-412/i)).toBeVisible({ timeout: 20_000 });
  });

  test("integrations surface failed demo integration backlog", async ({ page }) => {
    await page.goto("/dashboard/integrations");
    await expect(page.getByRole("region", { name: /failed integration events/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("demo.hris_membership_sync")).toBeVisible({ timeout: 10_000 });
  });
});
