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
 * Calm Focus token-changed surface: desk Today (`/dashboard?view=desk`).
 * ADR-UX-007 / AC-CF-A001 — closes coverage gap for desk home after token change.
 */
test.describe("a11y desk Today", () => {
  test.skip(!hasE2eCredentials, skipWithoutCredentials);

  test("@a11y desk Today has no serious/critical axe violations", async ({ page }) => {
    await signInViaEmailPassword(
      page,
      { email: e2eEmail!, password: e2ePassword! },
      "/dashboard?view=desk",
    );
    await expect(page.locator("[data-dashboard-shell='workspace']")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator("#main-content")).toBeVisible();
    await expectNoSeriousCriticalAxeViolations(page);
  });
});
