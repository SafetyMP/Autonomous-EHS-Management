import { expect, test } from "@playwright/test";

/**
 * Optional: set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD to a seeded user
 * (see `npm run db:seed`). CI skips this test unless both env vars are set.
 */
const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const runAuthFlow = Boolean(email && password);

test.describe("authenticated dashboard (optional)", () => {
  test.skip(
    !runAuthFlow,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD for signed-in E2E.",
  );

  test("reaches dashboard after sign-in", async ({ page }) => {
    await page.goto("/sign-in?callbackUrl=/dashboard");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password", { exact: true }).fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  });
});
