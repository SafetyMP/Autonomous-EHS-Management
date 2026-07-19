import { expect, test, type Page } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";
import {
  e2eContributorEmail,
  e2eContributorPassword,
  e2eEmail,
  e2ePassword,
  hasContributorCredentials,
  hasE2eCredentials,
  skipWithoutContributor,
  skipWithoutCredentials,
} from "./helpers/credentials";
import {
  clearClientStorageForFirstVisit,
  countInteractiveControlsInMain,
  countVisibleKpiTiles,
} from "./helpers/interactive-controls";

/**
 * ADR-UX-006 / AC-CF-D004 / AC-CF-D005 — Today desk density (storage-cleared).
 *
 * Tagged `@density`. Run via:
 *   npx playwright test --project=density
 *
 * Both desk personas required by gates.json G-CF-DENSITY-KPI-HIDDEN / G-CF-DENSITY-TODAY.
 * Logs DENSITY_METRIC lines so immutable evidence captures numeric counts.
 */

const VIEWPORT = { width: 1440, height: 900 } as const;

async function assertTodayDensity(page: Page, persona: "desk_supervisor" | "desk_contributor") {
  await page.setViewportSize(VIEWPORT);

  const main = page.locator("#main-content");
  await expect(main).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Operations/i);

  const kpiDetails = page.locator('details#dash-kpis[data-section="kpis"]');
  await expect(kpiDetails).toBeVisible();
  const kpiOpen = await kpiDetails.evaluate((el) => (el as HTMLDetailsElement).open);
  expect(kpiOpen, `${persona}: KPI details must stay closed after hydration`).toBe(false);

  const visibleKpis = await countVisibleKpiTiles(page);
  // Immutable evidence line (ops reads the log, not producer JSON alone).
  console.log(`DENSITY_METRIC persona=${persona} visible_kpi_tiles=${visibleKpis}`);
  expect(visibleKpis, `${persona}: visible [data-kpi-tile] must be 0`).toBe(0);
  await expect(page.locator("[data-kpi-tile]:visible")).toHaveCount(0);

  await expect(main.getByRole("heading", { level: 1 })).toHaveCount(1);

  const controlCount = await countInteractiveControlsInMain(page);
  console.log(
    `DENSITY_METRIC persona=${persona} interactive_controls=${controlCount} viewport=${VIEWPORT.width}x${VIEWPORT.height}`,
  );
  expect(controlCount, `${persona}: main interactive control count`).toBeGreaterThanOrEqual(0);
  expect(
    controlCount,
    `${persona}: interactive controls in #main-content (got ${controlCount})`,
  ).toBeLessThanOrEqual(12);
}

test.describe("Calm Focus Today density @density", () => {
  test.use({ viewport: VIEWPORT });

  test("@density desk_supervisor first-visit: KPI hidden, ≤12 controls", async ({ page }) => {
    test.skip(!hasE2eCredentials, skipWithoutCredentials);

    await signInViaEmailPassword(
      page,
      { email: e2eEmail!, password: e2ePassword! },
      "/dashboard?view=desk",
    );
    await clearClientStorageForFirstVisit(page);
    await page.goto("/dashboard?view=desk", { waitUntil: "networkidle" });
    await assertTodayDensity(page, "desk_supervisor");
  });

  test("@density desk_contributor first-visit: KPI hidden, ≤12 controls", async ({ page }) => {
    test.skip(!hasContributorCredentials, skipWithoutContributor);

    await signInViaEmailPassword(
      page,
      { email: e2eContributorEmail!, password: e2eContributorPassword! },
      "/dashboard?view=desk",
    );
    await clearClientStorageForFirstVisit(page);
    await page.goto("/dashboard?view=desk", { waitUntil: "networkidle" });
    await assertTodayDensity(page, "desk_contributor");
  });
});
