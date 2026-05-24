import { expect, test } from "@playwright/test";

test("@smoke home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/ISO 45001/);
  await expect(page.getByText("Autonomous EHS", { exact: true }).first()).toBeVisible();
});
