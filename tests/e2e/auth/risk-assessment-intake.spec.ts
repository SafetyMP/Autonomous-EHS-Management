import { expect, test } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";

const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const runAuthFlow = Boolean(email && password);

test.describe("authenticated risk assessment intake (planning)", () => {
  test.skip(
    !runAuthFlow,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD (CI sets these automatically).",
  );

  test("@smoke planning hub links to risk assessment roster", async ({ page }) => {
    await signInViaEmailPassword(page, { email: email!, password: password! }, "/dashboard/planning");
    await expect(page.getByRole("heading", { name: "Planning hub" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Risk assessments" })).toBeVisible();

    await page.getByRole("link", { name: "Create new assessment" }).click();
    await expect(page.getByRole("heading", { name: "New risk assessment" })).toBeVisible();
  });
});

test.describe("authenticated risk assessment intake (roster)", () => {
  test.skip(
    !runAuthFlow,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD (CI sets these automatically).",
  );

  test("@smoke records minimal risk assessment from roster new form", async ({ page }) => {
    const targetPath = "/dashboard/risk-assessments/new";
    await signInViaEmailPassword(page, { email: email!, password: password! }, targetPath);
    await expect(page.getByRole("heading", { name: "New risk assessment" })).toBeVisible();

    const context = `E2E risk roster ${Date.now()} — min ten.`;
    await page.getByLabel(/Context \/ scenario/i).fill(context);
    await page.getByRole("button", { name: "Save assessment" }).click();

    await expect(page).toHaveURL(/\/dashboard\/risk-assessments\/[0-9a-f-]{36}/i, {
      timeout: 30_000,
    });
  });
});