import { expect, test } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";

const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const runAuthFlow = Boolean(email && password);

test.describe("authenticated environmental regulatory permit intake", () => {
  test.skip(
    !runAuthFlow,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD (CI sets these automatically).",
  );

  test("@smoke submits minimal environmental permit from new form", async ({ page }) => {
    const targetPath = "/dashboard/environmental-permits/new";
    await signInViaEmailPassword(page, { email: email!, password: password! }, targetPath);
    await expect(page.getByRole("heading", { name: "New environmental permit" })).toBeVisible();

    const suffix = Date.now();
    await page.getByLabel("Title").fill(`E2E env permit ${suffix}`);
    await page.getByLabel("Permit identifier").fill(`E2E-EP-${suffix}`);
    await page.getByRole("button", { name: "Create permit" }).click();

    await expect(page).toHaveURL(/\/dashboard\/environmental-permits\/[0-9a-f-]{36}/i, {
      timeout: 30_000,
    });
    await expect(page.getByLabel("Title")).toHaveValue(`E2E env permit ${suffix}`);
    await expect(page.getByLabel("Permit identifier")).toHaveValue(`E2E-EP-${suffix}`);
  });
});
