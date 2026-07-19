import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";

/**
 * ADR-UX-007 / AC-CF-S003 / AC-CF-V010 — visual lane.
 * Separate from @smoke and a11y: tagged @visual; not grepped by test:e2e:smoke.
 *
 * Manifest contract always runs. Screenshot capture requires PLAYWRIGHT_VISUAL=1
 * plus signed-in env; otherwise capture tests skip honestly.
 */

const REPO_ROOT = path.resolve(__dirname, "../../..");
const MANIFEST_REL = "evidence/calm-focus-visual-manifest.json";
const CANONICAL_IDS = [
  "desk_contributor_today_collapsed",
  "desk_supervisor_today_collapsed",
  "desk_supervisor_today_kpi_expanded",
  "field_today",
] as const;

type Surface = {
  id: string;
  viewport: string;
  path: string;
  sha256: string;
  digest_kind?: string;
};

type Manifest = {
  program: string;
  cycle: string;
  status?: string;
  note?: string;
  surfaces: Surface[];
};

function loadManifest(): Manifest {
  const abs = path.join(REPO_ROOT, MANIFEST_REL);
  expect(existsSync(abs), `missing ${MANIFEST_REL}`).toBe(true);
  return JSON.parse(readFileSync(abs, "utf8")) as Manifest;
}

function sha256File(absPath: string): string {
  return createHash("sha256").update(readFileSync(absPath)).digest("hex");
}

async function capturePng(
  page: Page,
  relPath: string,
  viewport: { width: number; height: number },
): Promise<string> {
  await page.setViewportSize(viewport);
  const abs = path.join(REPO_ROOT, relPath);
  mkdirSync(path.dirname(abs), { recursive: true });
  await page.screenshot({ path: abs, fullPage: false });
  return sha256File(abs);
}

const e2eEmail = process.env.PLAYWRIGHT_E2E_EMAIL;
const e2ePassword = process.env.PLAYWRIGHT_E2E_PASSWORD;
const authOptIn =
  process.env.CI === "true" ||
  process.env.CI === "1" ||
  process.env.PLAYWRIGHT_E2E_FORCE === "1";
const hasSignedInVisual = Boolean(e2eEmail && e2ePassword && authOptIn);

test.describe("Calm Focus visual evidence scaffold @visual", () => {
  test("@visual manifest lists four canonical surfaces with sha256", async () => {
    const manifest = loadManifest();
    expect(manifest.program).toBeTruthy();
    expect(manifest.cycle).toBe("calm-focus-gen-1");
    expect(manifest.surfaces).toHaveLength(4);

    const ids = manifest.surfaces.map((s) => s.id);
    for (const id of CANONICAL_IDS) {
      expect(ids, `missing surface ${id}`).toContain(id);
    }

    for (const surface of manifest.surfaces) {
      expect(surface.viewport, surface.id).toMatch(/^\d+x\d+$/);
      expect(surface.path, surface.id).toMatch(/^evidence\/visual\/.+\.png$/);
      expect(surface.sha256, surface.id).toMatch(/^[a-f0-9]{64}$/);
      if (surface.digest_kind === "placeholder") {
        const expected = createHash("sha256")
          .update(`placeholder:${surface.id}`)
          .digest("hex");
        expect(surface.sha256, `${surface.id} placeholder digest`).toBe(expected);
      } else if (surface.digest_kind === "png") {
        const abs = path.join(REPO_ROOT, surface.path);
        expect(existsSync(abs), `${surface.id} PNG missing at ${surface.path}`).toBe(true);
        expect(sha256File(abs), `${surface.id} digest mismatch`).toBe(surface.sha256);
      }
    }
  });

  // Use test.skip (not in-body skip) so workers do not launch Chromium when capture is off.
  const captureEnabled = process.env.PLAYWRIGHT_VISUAL === "1" && hasSignedInVisual;
  const captureTest = captureEnabled ? test : test.skip;

  captureTest(
    "@visual screenshot capture + manifest digests (PLAYWRIGHT_VISUAL=1)",
    async ({ page }) => {
      test.setTimeout(180_000);
      const manifest = loadManifest();
      const byId = Object.fromEntries(manifest.surfaces.map((s) => [s.id, s]));

      await page.setViewportSize({ width: 1440, height: 900 });
      const contributorEmail =
        process.env.PLAYWRIGHT_E2E_CONTRIBUTOR_EMAIL?.trim() ||
        process.env.CI_E2E_CONTRIBUTOR_EMAIL?.trim() ||
        "e2e.contributor@ci.local";
      const contributorPassword =
        process.env.PLAYWRIGHT_E2E_CONTRIBUTOR_PASSWORD?.trim() ||
        process.env.CI_E2E_CONTRIBUTOR_PASSWORD?.trim() ||
        e2ePassword!;

      // S1 — desk_contributor Today collapsed
      await signInViaEmailPassword(
        page,
        { email: contributorEmail, password: contributorPassword },
        "/dashboard?view=desk",
      );
      await expect(page.locator("[data-dashboard-shell='workspace']")).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.locator("#main-content")).toBeVisible();
      const contribHash = await capturePng(page, byId.desk_contributor_today_collapsed.path, {
        width: 1440,
        height: 900,
      });
      byId.desk_contributor_today_collapsed.sha256 = contribHash;
      byId.desk_contributor_today_collapsed.digest_kind = "png";
      byId.desk_contributor_today_collapsed.viewport = "1440x900";

      // Sign out via UI so supervisor session is clean.
      await page.getByRole("button", { name: /^Sign out$/i }).click();
      await page.waitForURL(/sign-in|^\/$/i, { timeout: 30_000 }).catch(() => undefined);

      // S2/S3 — desk_supervisor
      await signInViaEmailPassword(
        page,
        { email: e2eEmail!, password: e2ePassword! },
        "/dashboard?view=desk",
      );
      await expect(page.locator("#main-content")).toBeVisible({ timeout: 30_000 });

      const deskCollapsedHash = await capturePng(
        page,
        byId.desk_supervisor_today_collapsed.path,
        { width: 1440, height: 900 },
      );
      byId.desk_supervisor_today_collapsed.sha256 = deskCollapsedHash;
      byId.desk_supervisor_today_collapsed.digest_kind = "png";
      byId.desk_supervisor_today_collapsed.viewport = "1440x900";

      const kpiSummary = page.locator("#dash-kpis > summary");
      if (await kpiSummary.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await kpiSummary.click();
        await expect(page.locator("[data-kpi-tile]").first()).toBeVisible({ timeout: 10_000 });
      }
      const deskExpandedHash = await capturePng(
        page,
        byId.desk_supervisor_today_kpi_expanded.path,
        { width: 1440, height: 900 },
      );
      byId.desk_supervisor_today_kpi_expanded.sha256 = deskExpandedHash;
      byId.desk_supervisor_today_kpi_expanded.digest_kind = "png";
      byId.desk_supervisor_today_kpi_expanded.viewport = "1440x900";

      // S4 — field
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/dashboard?view=field");
      await expect(page.locator("#main-content")).toBeVisible({ timeout: 30_000 });
      const fieldHash = await capturePng(page, byId.field_today.path, {
        width: 390,
        height: 844,
      });
      byId.field_today.sha256 = fieldHash;
      byId.field_today.digest_kind = "png";
      byId.field_today.viewport = "390x844";

      const pngCount = Object.values(byId).filter((s) => s.digest_kind === "png").length;
      const next: Manifest = {
        program: manifest.program,
        cycle: manifest.cycle,
        status: pngCount === 4 ? "captured" : "partial_capture",
        note:
          pngCount === 4
            ? "PNG digests from PLAYWRIGHT_VISUAL=1 capture (both desk personas + field). Human review of S1–S4 still required at promotion (AC-CF-V010 / UR-CF-007)."
            : "Partial PNG capture — one or more surfaces missing. Human review still required at promotion.",
        surfaces: CANONICAL_IDS.map((id) => byId[id]),
      };
      writeFileSync(path.join(REPO_ROOT, MANIFEST_REL), `${JSON.stringify(next, null, 2)}\n`);
    },
  );
});
