import { expect, test } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";
import { expectNoSeriousCriticalAxeViolations } from "./helpers/axe-wcag22";
import {
  e2eEmail,
  e2ePassword,
  hasE2eCredentials,
  skipWithoutCredentials,
} from "./helpers/credentials";

/** Gen-1 a11y: approvals decide list. */
test.describe("a11y approvals decide", () => {
  test.skip(!hasE2eCredentials, skipWithoutCredentials);

  test("@a11y approvals page has no serious/critical axe violations", async ({ page }) => {
    await signInViaEmailPassword(
      page,
      { email: e2eEmail!, password: e2ePassword! },
      "/dashboard/approvals",
    );
    await expect(page.getByRole("heading", { name: /My approvals/i })).toBeVisible({
      timeout: 30_000,
    });
    await expectNoSeriousCriticalAxeViolations(page);
  });
});
