import { expect, test } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";
import {
  e2eEmail,
  e2ePassword,
  hasE2eCredentials,
  skipWithoutCredentials,
} from "./helpers/credentials";

/**
 * AC-019 — keyboard E2E field home → incident create → submit.
 * Tagged @a11y (project a11y). Not part of default @smoke bloat.
 */
test.describe("a11y keyboard field to incident", () => {
  test.skip(!hasE2eCredentials, skipWithoutCredentials);

  test("@a11y @keyboard field home to incident create via keyboard", async ({ page }) => {
    const stamp = Date.now();
    const title = `E2E-A11Y-KB-${stamp}`;

    await signInViaEmailPassword(
      page,
      { email: e2eEmail!, password: e2ePassword! },
      "/dashboard?view=field",
    );
    await expect(page.getByRole("heading", { name: /Field/i })).toBeVisible({
      timeout: 30_000,
    });

    const reportLink = page.getByRole("link", { name: /Report incident/i }).first();
    await expect(reportLink).toBeVisible();
    await reportLink.focus();
    await expect(reportLink).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/dashboard\/incidents\/new/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Report incident" })).toBeVisible();

    await page.getByLabel("Title", { exact: true }).focus();
    await expect(page.getByLabel("Title", { exact: true })).toBeFocused();
    await page.keyboard.type(title);

    await page.getByLabel("What happened", { exact: true }).focus();
    await page.keyboard.type(
      "Keyboard-only field→incident a11y path — deterministic description for AC-019.",
    );

    await page.getByRole("button", { name: /^Submit$/ }).focus();
    await expect(page.getByRole("button", { name: /^Submit$/ })).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/dashboard\/incidents\/[0-9a-f-]{36}/i, {
      timeout: 30_000,
    });
  });
});
