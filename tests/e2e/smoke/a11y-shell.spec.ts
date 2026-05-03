import { expect, test } from "@playwright/test";

test("@smoke skip link targets main landmark on marketing home", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#main-content")).toBeVisible();
  const skip = page.getByRole("link", { name: /skip to main content/i });
  await expect(skip).toHaveCount(1);
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
});

test("@smoke sign-in exposes main landmark", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.locator("#main-content")).toBeVisible();
});
