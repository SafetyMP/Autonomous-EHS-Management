import { expect, test } from "@playwright/test";

/**
 * Lightweight shell landmarks kept in @smoke (not the full axe suite).
 * Full WCAG 2.2 AA axe coverage lives in `--project=a11y` (ADR-UX-004).
 */
test("@smoke skip link targets main landmark on marketing home", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#main-content")).toBeVisible();
  const skip = page.getByRole("link", { name: /skip to main content/i });
  await expect(skip).toHaveCount(1);
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("@smoke sign-in exposes main landmark", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.locator("main#main-content")).toBeVisible();
  await expect(page.getByRole("main")).toHaveCount(1);
});
