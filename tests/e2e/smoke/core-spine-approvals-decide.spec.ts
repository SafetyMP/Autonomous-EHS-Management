import { expect, test } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";

/**
 * R-007 Core spine: at least one Approvals decide path (CAPA plan approve).
 * Skips locally unless PLAYWRIGHT_E2E_EMAIL / PLAYWRIGHT_E2E_PASSWORD are set (CI sets both).
 */
const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const runSignedIn = Boolean(email && password);

test.describe("core spine approvals decide (@smoke)", () => {
  test.skip(
    !runSignedIn,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD (CI sets these automatically).",
  );

  test("@smoke CAPA plan approval decide path", async ({ page }) => {
    const stamp = Date.now();
    const capaTitle = `E2E-CAPA-APPR-${stamp}`;

    await signInViaEmailPassword(page, { email: email!, password: password! }, "/dashboard/capa");
    await expect(page.getByRole("heading", { name: /Corrective action/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel("Title", { exact: true }).fill(capaTitle);
    await page.getByLabel(/Details/i).fill(
      "Standalone CAPA for approvals smoke — documented rationale for Playwright.",
    );
    await page.getByRole("radio", { name: /Start pending plan approval/i }).check();
    await page.locator("#capa-plan-approver").selectOption({ label: email! });
    await page.getByRole("button", { name: /^Create CAPA$/ }).click();
    await expect(page.getByRole("link", { name: capaTitle })).toBeVisible({ timeout: 30_000 });

    await page.goto("/dashboard/approvals");
    await expect(page.getByRole("heading", { name: /My approvals/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("link", { name: capaTitle })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /^Review$/ }).first().click();
    await page.getByRole("button", { name: /^Approve plan$/ }).click();

    await expect(page.getByRole("link", { name: capaTitle })).toHaveCount(0, { timeout: 30_000 });
  });
});
