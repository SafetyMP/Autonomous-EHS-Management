import { expect, test } from "@playwright/test";
import { expectNoSeriousCriticalAxeViolations } from "./helpers/axe-wcag22";

/**
 * Gen-1 a11y: chrome skip-link + landmarks (unauthenticated surfaces).
 * AC-007 / AC-020 — does not bloat default @smoke.
 */
test.describe("a11y chrome landmarks", () => {
  test("@a11y marketing home skip-link and main landmark", async ({ page }) => {
    await page.goto("/");
    const main = page.locator("#main-content");
    await expect(main).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);

    const skip = page.getByRole("link", { name: /skip to main content/i });
    await expect(skip).toHaveCount(1);
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(main).toBeFocused();

    await expectNoSeriousCriticalAxeViolations(page);
  });

  test("@a11y sign-in skip-link targets main landmark", async ({ page }) => {
    await page.goto("/sign-in");
    const main = page.locator("main#main-content");
    await expect(main).toBeVisible();
    const skip = page.getByRole("link", { name: /skip to main content/i });
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(main).toBeFocused();
    await expectNoSeriousCriticalAxeViolations(page);
  });
});
