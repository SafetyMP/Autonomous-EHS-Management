import { expect, test } from "@playwright/test";

test("@smoke home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/incident.*corrective action/i);
  await expect(page.getByText("Autonomous EHS", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to EHS Console" }).first()).toHaveAttribute(
    "href",
    "/sign-in",
  );
});
