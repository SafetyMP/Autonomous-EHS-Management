import { expect, test } from "@playwright/test";

/**
 * Requires seeded RBAC/org (`npm run db:seed` with `SEED_ADMIN_EMAIL` matching this user).
 * See AGENTS.md optional Playwright credentials.
 */
const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const runAuthFlow = Boolean(email && password);

test.describe("authenticated incident intake (optional)", () => {
  test.skip(
    !runAuthFlow,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD for authenticated CRUD E2E.",
  );

  test("submits minimal incident from new form", async ({ page }) => {
    const targetPath = "/dashboard/incidents/new";
    await page.goto(`/sign-in?callbackUrl=${encodeURIComponent(targetPath)}`);
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password", { exact: true }).fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(new RegExp(`/dashboard/incidents/new`), { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Report incident" })).toBeVisible();

    await page.locator("#title").fill(`E2E-${Date.now()}`);
    await page.locator("#desc").fill(
      "Playwright-driven incident — deterministic description length for validators.",
    );
    await page.getByRole("button", { name: /^Submit$/ }).click();

    await expect(page).toHaveURL(/\/dashboard\/incidents\/[0-9a-f-]{36}/i, {
      timeout: 30_000,
    });
  });
});
