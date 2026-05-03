import { expect, test } from "@playwright/test";

/**
 * In GitHub Actions the job sets PLAYWRIGHT_E2E_* after `seed-ci-e2e`.
 * Locally, skip unless you export the same credentials and run Postgres + migrate + seed.
 */
const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const runSignedIn = Boolean(email && password);

test.describe("authenticated dashboard (@smoke when creds set)", () => {
  test.skip(
    !runSignedIn,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD (CI sets these automatically).",
  );

  test("@smoke reaches dashboard after sign-in", async ({ page }) => {
    await page.goto("/sign-in?callbackUrl=/dashboard");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password", { exact: true }).fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  });
});
