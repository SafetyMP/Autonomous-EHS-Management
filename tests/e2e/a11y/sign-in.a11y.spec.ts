import { expect, test } from "@playwright/test";
import { expectNoSeriousCriticalAxeViolations } from "./helpers/axe-wcag22";

/**
 * Gen-1 a11y: sign-in (no credentials required).
 * AC-007 / AC-020 — axe WCAG 2.2 AA; serious/critical fail.
 */
test.describe("a11y sign-in", () => {
  test("@a11y sign-in page has no serious/critical axe violations", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.locator("#main-content")).toBeVisible();
    await expectNoSeriousCriticalAxeViolations(page);
  });
});
