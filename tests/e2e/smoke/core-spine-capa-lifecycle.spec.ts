import { expect, test } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";

/**
 * R-007 Core spine: CAPA lifecycle to verified with source traceability.
 * Skips locally unless PLAYWRIGHT_E2E_EMAIL / PLAYWRIGHT_E2E_PASSWORD are set (CI sets both).
 */
const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const runSignedIn = Boolean(email && password);

test.describe("core spine CAPA lifecycle (@smoke)", () => {
  test.skip(
    !runSignedIn,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD (CI sets these automatically).",
  );

  test("@smoke CAPA planned → verified with incident source link", async ({ page }) => {
    const stamp = Date.now();
    const incidentTitle = `E2E-CAPA-SRC-${stamp}`;
    const capaTitle = `E2E-CAPA-LIFE-${stamp}`;

    await signInViaEmailPassword(page, { email: email!, password: password! }, "/dashboard/incidents/new");
    await expect(page.getByRole("heading", { name: "Report incident" })).toBeVisible();
    await page.getByLabel("Title", { exact: true }).fill(incidentTitle);
    await page.getByLabel("What happened", { exact: true }).fill(
      "Playwright CAPA source incident — deterministic description for validators.",
    );
    await page.getByRole("button", { name: /^Submit$/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/incidents\/[0-9a-f-]{36}/i, { timeout: 30_000 });

    await page.goto("/dashboard/capa");
    await expect(page.getByRole("heading", { name: /Corrective action/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel("Title", { exact: true }).fill(capaTitle);
    await page.getByText("Link to incident or audit finding (optional)").click();
    await page.getByRole("radio", { name: /^Incident$/ }).check();
    await page.locator("#capa-incident").selectOption({ label: incidentTitle });
    await page.getByRole("radio", { name: /Start as planned/i }).check();
    await page.getByRole("button", { name: /^Create CAPA$/ }).click();

    const capaLink = page.getByRole("link", { name: capaTitle });
    await expect(capaLink).toBeVisible({ timeout: 30_000 });
    await capaLink.click();
    await expect(page).toHaveURL(/\/dashboard\/capa\/[0-9a-f-]{36}/i, { timeout: 30_000 });

    await expect(page.getByRole("heading", { name: "Source & context" })).toBeVisible();
    await expect(page.getByRole("link", { name: incidentTitle })).toBeVisible();

    await page.getByRole("button", { name: /^Start work$/ }).click();
    await expect(page.getByText(/^in progress$/i).first()).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /^Mark complete$/ }).click();
    await expect(page.getByText(/^completed$/i).first()).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /^Verify effectiveness$/ }).click();
    await page
      .getByLabel(/Effectiveness \/ verification notes/i)
      .fill("Playwright verification notes confirming corrective action effectiveness.");
    await page.getByRole("button", { name: /^Confirm verification$/ }).click();
    await expect(page.getByText(/^verified$/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Verification notes/i)).toBeVisible();
  });
});
