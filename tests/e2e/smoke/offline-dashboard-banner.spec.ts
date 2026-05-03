import { expect, test } from "@playwright/test";

/**
 * Validates root-layout offline banner while signed in (same gated creds as other dashboard smoke tests).
 */
const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const runSignedIn = Boolean(email && password);

test.describe("offline dashboard banner (@smoke when creds set)", () => {
  test.skip(
    !runSignedIn,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD (CI sets these automatically).",
  );

  test("@smoke shows offline notice when navigator is offline", async ({ context, page }) => {
    await page.goto("/sign-in?callbackUrl=/dashboard");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password", { exact: true }).fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    await context.setOffline(true);
    await page.waitForSelector('[role="status"]:has-text("offline")');
    await expect(page.getByText(/You appear to be offline/i)).toBeVisible();
    await context.setOffline(false);
  });
});
