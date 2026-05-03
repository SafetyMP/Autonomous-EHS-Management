import { expect, test } from "@playwright/test";

test("@smoke dashboard requires auth", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page).toHaveURL(/callbackUrl/);

  const u = new URL(page.url());
  expect(decodeURIComponent(u.searchParams.get("callbackUrl") ?? "")).toBe("/dashboard");
});

test("@smoke deep dashboard path preserves callbackUrl for return after login", async ({ page }) => {
  const target = "/dashboard/incidents/new";
  await page.goto(target);
  await expect(page).toHaveURL(/\/sign-in/);
  const u = new URL(page.url());
  expect(decodeURIComponent(u.searchParams.get("callbackUrl") ?? "")).toBe(target);
});

test("@smoke analytics route preserves callbackUrl for return after login", async ({ page }) => {
  const target = "/dashboard/analytics";
  await page.goto(target);
  await expect(page).toHaveURL(/\/sign-in/);
  const u = new URL(page.url());
  expect(decodeURIComponent(u.searchParams.get("callbackUrl") ?? "")).toBe(target);
});
