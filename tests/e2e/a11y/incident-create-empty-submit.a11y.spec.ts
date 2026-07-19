import { expect, test } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";
import {
  e2eEmail,
  e2ePassword,
  hasE2eCredentials,
  skipWithoutCredentials,
} from "./helpers/credentials";

/** AC-020 — empty-submit surfaces alert + aria-invalid + aria-describedby. */
test.describe("a11y incident create empty submit", () => {
  test.skip(!hasE2eCredentials, skipWithoutCredentials);

  test("@a11y incident create empty submit shows alert and aria-invalid", async ({ page }) => {
    await signInViaEmailPassword(
      page,
      { email: e2eEmail!, password: e2ePassword! },
      "/dashboard/incidents/new",
    );
    await expect(page.getByRole("heading", { name: "Report incident" })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel("Title").fill("");
    await page.getByLabel("What happened").fill("");
    await page.getByRole("button", { name: /^Submit$/i }).click();

    const alert = page.getByRole("alert").filter({ hasText: /required/i });
    await expect(alert).toBeVisible({ timeout: 10_000 });

    const invalid = page.locator("[aria-invalid='true']");
    await expect(invalid.first()).toBeVisible();
    const describedBy = await invalid.first().getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toBeVisible();
  });
});
