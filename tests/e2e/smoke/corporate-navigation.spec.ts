import { expect, test } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";

const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;

test.describe("corporate navigation (@smoke)", () => {
  test.skip(
    !email || !password,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD against the migrated, seeded database.",
  );

  test("@smoke finds corrective actions and reports without losing organization context", async ({ page }) => {
    if (!email || !password) return;
    await page.setViewportSize({ width: 1440, height: 900 });
    await signInViaEmailPassword(page, { email, password }, "/dashboard");
    const workspace = page.locator('[data-dashboard-shell="workspace"]');
    await expect(workspace).toHaveAttribute("data-organization-id", /.+/, { timeout: 30_000 });
    const organizationId = await workspace.getAttribute("data-organization-id");
    if (!organizationId) throw new Error("Seeded EHS organization was not selected");

    const sidebar = page.getByRole("complementary", { name: "Workspace", exact: true });
    const search = sidebar.getByRole("searchbox", { name: "Find a workspace" });
    await expect(sidebar.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute("aria-current", "page");
    await search.fill("CAPA");
    await sidebar.getByRole("link", { name: "Corrective actions (CAPA)", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/capa$/);
    await expect(workspace).toHaveAttribute("data-organization-id", organizationId);

    await search.fill("");
    await sidebar.locator("summary").filter({ hasText: "Reports & evidence" }).click();
    await sidebar.getByRole("link", { name: "Incidence rates", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/analytics\/incidence-rates$/);
    await expect(sidebar.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(sidebar.getByRole("link", { name: "Incidence rates", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(sidebar.getByRole("link", { name: "Metrics", exact: true })).not.toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("navigation", { name: "Breadcrumb", exact: true })).toContainText("Reports & evidence");
    await expect(workspace).toHaveAttribute("data-organization-id", organizationId);

    await page.reload();
    await expect(workspace).toHaveAttribute("data-organization-id", organizationId);
    await page.locator('[data-dashboard-chrome="site-header"]').getByRole("link", { name: "Overview", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("@smoke mobile menu contains keyboard focus and restores it on Escape", async ({ page }) => {
    if (!email || !password) return;
    await page.setViewportSize({ width: 390, height: 844 });
    await signInViaEmailPassword(page, { email, password }, "/dashboard");
    const menu = page.getByRole("button", { name: "Open workspace menu", exact: true });
    await menu.click();
    const dialog = page.getByRole("dialog", { name: "Workspace navigation", exact: true });
    const close = dialog.getByRole("button", { name: "Close", exact: true });
    await expect(close).toBeFocused();
    await expect(dialog.getByRole("link", { name: "Overview", exact: true })).toBeVisible();

    await page.keyboard.press("Shift+Tab");
    const focusables = page.locator("#workspace-navigation").locator(
      'button:visible, input:visible, select:visible, summary:visible, a[href]:visible',
    );
    await expect(focusables.last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(menu).toBeFocused();

    await menu.click();
    await dialog.getByRole("searchbox", { name: "Find a workspace" }).fill("CAPA");
    await dialog.getByRole("link", { name: "Corrective actions (CAPA)", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/capa$/);
    await expect(dialog).toHaveCount(0);
  });
});
