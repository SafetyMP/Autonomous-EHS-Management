import { expect, test } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";

const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;

test.describe("corporate incident to corrective action navigation", () => {
  test.skip(!email || !password, "Set signed-in smoke credentials against the seeded test database.");

  test("@smoke title filter resets from navigation and survives the linked corrective action journey", async ({ page }) => {
    test.setTimeout(90_000);
    const stamp = Date.now();
    const titlePrefix = `E2E-JOURNEY-${stamp}`;
    const incidentTitle = `${titlePrefix} & follow-up`;
    const capaTitle = `E2E-JOURNEY-CAPA-${stamp}`;
    if (!email || !password) throw new Error("Signed-in smoke credentials are required.");

    await signInViaEmailPassword(page, { email, password }, "/dashboard/incidents/new");
    await page.getByLabel("Title", { exact: true }).fill(incidentTitle);
    await page.getByLabel("What happened", { exact: true }).fill(
      "Synthetic incident for checking corporate navigation and corrective action source traceability.",
    );
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/incidents\/[0-9a-f-]{36}/i, { timeout: 30_000 });
    const incidentPath = new URL(page.url()).pathname;
    await page.getByRole("link", { name: "Back to incidents", exact: true }).click();

    const filter = page.getByRole("searchbox", { name: "Filter by title" });
    await filter.fill(titlePrefix);
    await filter.pressSequentially(" & follow-up");
    await expect(filter).toHaveValue(incidentTitle);
    await expect(page).toHaveURL((url) => url.searchParams.get("q") === incidentTitle);
    await expect(page.getByRole("link", { name: incidentTitle, exact: true })).toBeVisible();

    // Same-path navigation must clear the input and rows, not only remove q from the URL.
    await page.getByRole("complementary", { name: "Workspace" })
      .getByRole("link", { name: "Incidents", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/dashboard/incidents" && !url.searchParams.has("q"));
    await expect(filter).toHaveValue("");

    await filter.fill(incidentTitle);
    await page.getByRole("link", { name: incidentTitle, exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === incidentPath && url.searchParams.get("incidentFilter") === incidentTitle);
    await expect(page.getByRole("heading", { level: 1, name: incidentTitle, exact: true })).toBeVisible();

    const linkedActions = page.getByRole("region", { name: "Linked corrective actions", exact: true });
    await expect(linkedActions).toHaveCount(1);
    await linkedActions.getByRole("button", { name: "Create CAPA from this incident", exact: true }).click();
    await linkedActions.getByLabel("CAPA title", { exact: true }).fill(capaTitle);
    await linkedActions.getByLabel("Details (optional)", { exact: true }).fill(
      "Synthetic corrective action linked to the incident for a navigation regression check.",
    );
    await linkedActions.getByRole("button", { name: "Create CAPA from incident", exact: true }).click();
    await linkedActions.getByRole("link", { name: capaTitle, exact: true }).click();
    await expect(page).toHaveURL((url) => /^\/dashboard\/capa\/[0-9a-f-]{36}$/i.test(url.pathname)
      && url.searchParams.get("incidentFilter") === incidentTitle);
    await expect(page.getByRole("heading", { level: 1, name: capaTitle, exact: true })).toBeVisible();

    // Mobile section navigation must clear the two-row sticky organization header.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("link", { name: "Progress & verification", exact: true }).click();
    const headerBottom = await page.locator('[data-dashboard-chrome="site-header"]').evaluate((node) => node.getBoundingClientRect().bottom);
    const sectionTop = await page.locator("#action-progress").evaluate((node) => node.getBoundingClientRect().top);
    expect(sectionTop).toBeGreaterThanOrEqual(headerBottom);
    await page.setViewportSize({ width: 1280, height: 720 });

    const source = page.getByRole("region", { name: "Source & context", exact: true });
    await source.getByRole("link", { name: incidentTitle, exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === incidentPath
      && url.searchParams.get("incidentFilter") === incidentTitle && url.hash === "#corrective-actions");
    await page.getByRole("link", { name: "Back to incidents", exact: true }).click();
    await expect(filter).toHaveValue(incidentTitle);
    await expect(page).toHaveURL((url) => url.pathname === "/dashboard/incidents" && url.searchParams.get("q") === incidentTitle);
    await expect(page.getByRole("link", { name: incidentTitle, exact: true })).toBeVisible();
  });
});
