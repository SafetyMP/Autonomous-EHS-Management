import { expect, test } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";

const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const runAuthFlow = Boolean(email && password);

test.describe("authenticated contractor credential intake", () => {
  test.skip(
    !runAuthFlow,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD (CI sets these automatically).",
  );

  test("@smoke creates external party and adds COI credential", async ({ page }) => {
    const company = `E2E Contractor ${Date.now()}`;
    await signInViaEmailPassword(page, { email: email!, password: password! }, "/dashboard/program");
    await expect(page.getByRole("heading", { name: "Program overview" })).toBeVisible();

    await page.getByPlaceholder("Company name").fill(company);
    await page
      .locator("form")
      .filter({ has: page.getByPlaceholder("Company name") })
      .getByRole("button", { name: "Add" })
      .click();
    await expect(page.getByText(company)).toBeVisible({ timeout: 15_000 });

    await page.goto("/dashboard/contractors");
    await expect(page.getByRole("heading", { name: /Contractors/i })).toBeVisible();
    await page
      .getByRole("row")
      .filter({ hasText: company })
      .getByRole("link", { name: "Credentials" })
      .click();

    await expect(page.getByRole("heading", { name: company })).toBeVisible({ timeout: 15_000 });
    await page.getByLabel(/Policy \/ permit ID/i).fill(`COI-${Date.now()}`);

    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const iso = future.toISOString().slice(0, 10);
    await page.getByLabel("Valid to").fill(iso);

    await page.getByRole("button", { name: "Add credential" }).click();
    await expect(page.getByRole("cell", { name: /insurance coi/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
