import { expect, test } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";

/**
 * In CI (`verify:all`): runs as `@smoke` with Postgres + [`seed-ci-e2e`](scripts/seed-ci-e2e.ts).
 * Locally: requires `npm run db:seed` / `db:seed:ci`, migrate, and `PLAYWRIGHT_E2E_*` (see AGENTS.md).
 */
const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const runAuthFlow = Boolean(email && password);

test.describe("authenticated incident intake", () => {
  test.skip(
    !runAuthFlow,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD (CI sets these automatically).",
  );

  test("@smoke submits minimal incident from new form", async ({ page }) => {
    const targetPath = "/dashboard/incidents/new";
    await signInViaEmailPassword(page, { email: email!, password: password! }, targetPath);
    await expect(page.getByRole("heading", { name: "Report incident" })).toBeVisible();

    await page.locator("#title").fill(`E2E-${Date.now()}`);
    await page.locator("#desc").fill(
      "Playwright-driven incident — deterministic description length for validators.",
    );
    await page.getByRole("button", { name: /^Submit$/ }).click();

    await expect(page).toHaveURL(/\/dashboard\/incidents\/[0-9a-f-]{36}/i, {
      timeout: 30_000,
    });
  });
});
