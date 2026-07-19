import { expect, test } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";

/**
 * R-007 Core spine: audit-trail list shows a mutation row; exportCsv when Core.
 * Skips locally unless PLAYWRIGHT_E2E_EMAIL / PLAYWRIGHT_E2E_PASSWORD are set (CI sets both).
 */
const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const runSignedIn = Boolean(email && password);

test.describe("core spine audit trail (@smoke)", () => {
  test.skip(
    !runSignedIn,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD (CI sets these automatically).",
  );

  test("@smoke audit-trail list shows mutation row and CSV export", async ({ page }) => {
    const stamp = Date.now();
    const incidentTitle = `E2E-AUDIT-${stamp}`;

    await signInViaEmailPassword(page, { email: email!, password: password! }, "/dashboard/incidents/new");
    await expect(page.getByRole("heading", { name: "Report incident" })).toBeVisible();
    await page.getByLabel("Title", { exact: true }).fill(incidentTitle);
    await page.getByLabel("What happened", { exact: true }).fill(
      "Playwright audit-trail smoke — creates an incident.create audit_log row.",
    );
    await page.getByRole("button", { name: /^Submit$/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/incidents\/[0-9a-f-]{36}/i, { timeout: 30_000 });

    await page.goto("/dashboard/audit-trail");
    await expect(page.getByRole("heading", { name: /System audit trail/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel("Action", { exact: true }).fill("incident.create");
    await page.getByRole("button", { name: /^Apply filters$/ }).click();

    await expect(page.getByRole("cell", { name: "incident.create" }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("cell", { name: /incident/i }).first()).toBeVisible();

    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    await page.getByRole("button", { name: /Download CSV/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/audit-trail-.*\.csv$/i);
  });
});
