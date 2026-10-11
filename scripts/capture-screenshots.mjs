/**
 * Capture README screenshots and demo GIF from a running dev server.
 *
 * Usage:
 *   cp .env.demo.example .env.local
 *   npm run demo:up && npm run dev
 *   npm run screenshots
 *
 * Default capture is the public path only: spine card, incidents, CAPA, incidence rates.
 * Wider console gallery (not the default command):
 *   npm run screenshots:gallery
 *
 * Rebuild GIF only from existing PNGs (no browser):
 *   npm run screenshots:rebuild-gif
 *
 * Optional: SCREENSHOT_BASE_URL=http://localhost:3000 npm run screenshots
 * (Keep BETTER_AUTH_URL / NEXT_PUBLIC_APP_URL aligned with SCREENSHOT_BASE_URL.)
 *
 * CI: set CI=1 to use bundled Chromium instead of system Chrome.
 */
import { config as loadEnv } from "dotenv";
import { chromium } from "playwright";
import gifenc from "gifenc";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

loadEnv({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
loadEnv({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.demo.example"),
  override: false,
});

const defaultDemoEmail = "demo.admin@example.com";
const defaultDemoPassword = "demo-admin-password-change-me";

const { GIFEncoder, quantize, applyPalette } = gifenc;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "docs", "assets");
const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";

/** Default `npm run screenshots` set. Spine is an element clip, not a viewport frame. */
const readmePages = [
  { path: "/dashboard", file: "spine-home.png", name: "Incident, CAPA, and TRIR", clip: "spine" },
  { path: "/dashboard/incidents", file: "incidents.png", name: "Incidents" },
  { path: "/dashboard/capa", file: "capa.png", name: "CAPA register" },
  {
    path: "/dashboard/analytics/incidence-rates",
    file: "incidence-rates.png",
    name: "Incidence rates",
  },
];

/** Wider console. Captured only when argv includes `--gallery`. */
const galleryPages = [
  { path: "/dashboard", file: "command-center.png", name: "Command center" },
  { path: "/dashboard/approvals", file: "approvals.png", name: "Approvals" },
  { path: "/dashboard/tasks", file: "tasks.png", name: "Tasks & reviews" },
  { path: "/dashboard/inspections", file: "inspections.png", name: "Inspections" },
  { path: "/dashboard/analytics", file: "analytics.png", name: "Metrics" },
  { path: "/dashboard/audit-trail", file: "audit-trail.png", name: "Audit trail" },
  { path: "/dashboard/observations", file: "observations.png", name: "Observations" },
  { path: "/dashboard/permits", file: "permits.png", name: "Work permits" },
];

/**
 * demo.gif frames. Same 1280×800 viewport as the page screenshots.
 * spine-home.png is omitted (element clip, different height).
 */
const gifFrameFiles = ["incidents.png", "capa.png", "incidence-rates.png"];

const namedPages = [...readmePages, ...galleryPages];

/** Frame duration in milliseconds (gifenc stores delay/10 as GIF centiseconds). */
const GIF_FRAME_DELAY_MS = 2_000;

function launchOptions() {
  if (process.env.CI) {
    return { headless: true };
  }
  return { channel: "chrome", headless: true };
}

async function waitForSignedInDashboard(page) {
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  await page.getByRole("heading", { level: 1 }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  const heading = await page.getByRole("heading", { level: 1 }).textContent();
  if (!heading || /sign in to ehs console/i.test(heading)) {
    throw new Error("Still on sign-in page after login attempt.");
  }
}

async function signInDemoAdmin(page) {
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: "networkidle" });
  const demoButton = page.getByRole("button", { name: /try demo admin/i });
  if (await demoButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await demoButton.click();
    await waitForSignedInDashboard(page);
    return;
  }

  const email = process.env.DEMO_ADMIN_EMAIL?.trim() || defaultDemoEmail;
  const password = process.env.DEMO_ADMIN_PASSWORD?.trim() || defaultDemoPassword;
  if (!email || !password) {
    throw new Error(
      "Demo quick login unavailable. Enable DEMO_MODE or set DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD in .env.local.",
    );
  }

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await waitForSignedInDashboard(page);
}

async function assertAuthenticatedRoute(page, route) {
  const url = page.url();
  if (url.includes("/sign-in")) {
    throw new Error(`Session lost before ${route}; landed on sign-in (${url}).`);
  }
}

async function writeDemoGif(frames) {
  const encoder = GIFEncoder();
  for (const { buffer, name } of frames) {
    const { data, width, height } = PNG.sync.read(buffer);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    encoder.writeFrame(index, width, height, { palette, delay: GIF_FRAME_DELAY_MS });
    console.log(`GIF frame: ${name}`);
  }
  encoder.finish();
  const gifPath = path.join(outDir, "demo.gif");
  await writeFile(gifPath, Buffer.from(encoder.bytes()));
  console.log(`Captured demo GIF -> docs/assets/demo.gif`);
}

async function rebuildGifFromExisting() {
  await mkdir(outDir, { recursive: true });
  const frames = [];
  for (const file of gifFrameFiles) {
    const pageMeta = namedPages.find((entry) => entry.file === file);
    const name = pageMeta?.name ?? file;
    const buffer = await readFile(path.join(outDir, file));
    frames.push({ buffer, name });
    console.log(`Loaded ${name} -> docs/assets/${file}`);
  }
  await writeDemoGif(frames);
}

async function scrollBelowAppHeader(page, locator) {
  await locator.evaluate((el) => {
    el.scrollIntoView({ block: "start" });
    const header = document.querySelector("header");
    const offset = (header?.getBoundingClientRect().height ?? 64) + 8;
    window.scrollBy(0, -offset);
  });
  await page.waitForTimeout(300);
}

async function revealCapaRegister(page) {
  const table = page.getByRole("table", { name: /corrective actions for the workspace/i });
  await table.waitFor({ state: "visible", timeout: 30_000 });
  await table.getByRole("link").first().waitFor({ state: "visible", timeout: 30_000 });
  await scrollBelowAppHeader(page, table);
}

async function revealSavedTrir(page) {
  await page.getByRole("heading", { level: 1, name: "Incidence rates" }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Compute and save snapshot" }).click();
  await page.getByText(/Snapshot saved/i).waitFor({ state: "visible", timeout: 30_000 });
  const heading = page.getByRole("heading", { name: "Recordable incidence rate (TRIR)" });
  await page.getByText("(partial months)").first().waitFor({ state: "visible", timeout: 30_000 });
  await scrollBelowAppHeader(page, heading);
}

async function screenshotSpineSection(page, route) {
  const section = page.locator('[aria-labelledby="incident-capa-spine-heading"]');
  const appeared = await section
    .waitFor({ state: "visible", timeout: 30_000 })
    .then(() => true)
    .catch(() => false);
  if (!appeared || (await section.count()) === 0) {
    throw new Error(
      `Missing section [aria-labelledby="incident-capa-spine-heading"] after ${route}.`,
    );
  }
  return section.screenshot();
}

async function captureLive(pageList, { writeGif }) {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch(launchOptions());
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  await signInDemoAdmin(page);

  // Prefer a quiet first viewport for the README hero (dismiss product changelog if shown).
  const dismissWhatsNew = page.getByRole("button", { name: /^dismiss$/i });
  if (await dismissWhatsNew.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await dismissWhatsNew.click();
    await page.waitForTimeout(300);
  }

  const captured = new Map();

  for (const { path: route, file, name, clip } of pageList) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await assertAuthenticatedRoute(page, route);
    let buffer;
    if (clip === "spine") {
      buffer = await screenshotSpineSection(page, route);
    } else {
      if (file === "capa.png") {
        await revealCapaRegister(page);
      }
      if (file === "incidence-rates.png") {
        await revealSavedTrir(page);
      }
      buffer = await page.screenshot({ fullPage: false });
    }
    const dest = path.join(outDir, file);
    await writeFile(dest, buffer);
    console.log(`Captured ${name} -> docs/assets/${file}`);
    captured.set(file, { buffer, name });
  }

  if (writeGif) {
    const gifFrames = gifFrameFiles.map((file) => {
      const frame = captured.get(file);
      if (!frame) {
        throw new Error(`Missing GIF frame docs/assets/${file}.`);
      }
      return frame;
    });
    await writeDemoGif(gifFrames);
  }
  await browser.close();
}

async function main() {
  if (process.argv.includes("--from-existing")) {
    await rebuildGifFromExisting();
    return;
  }
  const gallery = process.argv.includes("--gallery");
  await captureLive(gallery ? galleryPages : readmePages, { writeGif: !gallery });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
