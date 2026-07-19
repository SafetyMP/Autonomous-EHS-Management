import { expect, test } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";
import { expectNoSeriousCriticalAxeViolations } from "./helpers/axe-wcag22";
import {
  e2eEmail,
  e2ePassword,
  hasE2eCredentials,
  skipWithoutCredentials,
} from "./helpers/credentials";

/**
 * Gen-1 a11y: field home (`/dashboard?view=field`).
 * Skips gracefully without credentials (local auth/DB).
 */
test.describe("a11y field home", () => {
  test.skip(!hasE2eCredentials, skipWithoutCredentials);

  test("@a11y field home has no serious/critical axe violations", async ({ page }) => {
    await signInViaEmailPassword(
      page,
      { email: e2eEmail!, password: e2ePassword! },
      "/dashboard?view=field",
    );
    await expect(page.getByRole("heading", { name: /Field/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expectNoSeriousCriticalAxeViolations(page);
  });
});
