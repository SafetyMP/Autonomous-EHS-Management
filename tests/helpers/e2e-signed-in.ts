import { expect, type Page } from "@playwright/test";

/**
 * Drive the email/password sign-in form and wait until the URL contains the post-login path
 * (typically the `callbackUrl` path provided to `/sign-in`).
 */
export async function signInViaEmailPassword(
  page: Page,
  credentials: { email: string; password: string },
  callbackPathname: string,
): Promise<void> {
  const path = callbackPathname.startsWith("/") ? callbackPathname : `/${callbackPathname}`;
  await page.goto(`/sign-in?callbackUrl=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(
    new RegExp(callbackPathname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    { timeout: 30_000 },
  );
}
