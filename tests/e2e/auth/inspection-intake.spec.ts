import { expect, test } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";

const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const runAuthFlow = Boolean(email && password);

test.describe("authenticated inspection intake", () => {
  test.skip(
    !runAuthFlow,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD (CI sets these automatically).",
  );

  test("@smoke creates minimal inspection from new form", async ({ page }) => {
    const targetPath = "/dashboard/inspections/new";
    await signInViaEmailPassword(page, { email: email!, password: password! }, targetPath);
    await expect(page.getByRole("heading", { name: "New inspection" })).toBeVisible();

    await page.getByLabel("Title", { exact: true }).fill(`E2E inspection ${Date.now()}`);
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page).toHaveURL(/\/dashboard\/inspections\/[0-9a-f-]{36}/i, {
      timeout: 30_000,
    });
  });
});
