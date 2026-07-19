import { expect, test } from "@playwright/test";

test("@smoke sign-in page shows form", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.locator("main#main-content")).toBeVisible();
});
