/**
 * Capture README screenshots and demo GIF from a running dev server.
 *
 * Usage:
 *   cp .env.demo.example .env.local
 *   npm run demo:up && npm run dev
 *   npm run screenshots
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

const pages = [
  { path: "/dashboard", file: "command-center.png", name: "Command center" },
  { path: "/dashboard/incidents", file: "incidents.png", name: "Incidents" },
  { path: "/dashboard/capa", file: "capa.png", name: "CAPA register" },
  { path: "/dashboard/approvals", file: "approvals.png", name: "Approvals" },
  { path: "/dashboard/tasks", file: "tasks.png", name: "Tasks & reviews" },
  { path: "/dashboard/inspections", file: "inspections.png", name: "Inspections" },
  { path: "/dashboard/analytics", file: "analytics.png", name: "Metrics" },
  { path: "/dashboard/audit-trail", file: "audit-trail.png", name: "Audit trail" },
  { path: "/dashboard/observations", file: "observations.png", name: "Observations" },
  { path: "/dashboard/permits", file: "permits.png", name: "Work permits" },
];

/** README hero GIF frames (subset of `pages`). */
const gifFrameFiles = [
  "command-center.png",
  "incidents.png",
  "capa.png",
  "approvals.png",
  "tasks.png",
  "analytics.png",
];

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
    const pageMeta = pages.find((entry) => entry.file === file);
    const name = pageMeta?.name ?? file;
    const buffer = await readFile(path.join(outDir, file));
    frames.push({ buffer, name });
    console.log(`Loaded ${name} -> docs/assets/${file}`);
  }
  await writeDemoGif(frames);
}

async function captureLive() {
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

  const gifFrames = [];

  for (const { path: route, file, name } of pages) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await assertAuthenticatedRoute(page, route);
    const buffer = await page.screenshot({ fullPage: false });
    const dest = path.join(outDir, file);
    await writeFile(dest, buffer);
    console.log(`Captured ${name} -> docs/assets/${file}`);
    if (gifFrameFiles.includes(file)) {
      gifFrames.push({ buffer, name });
    }
  }

  await writeDemoGif(gifFrames);
  await browser.close();
}

async function main() {
  if (process.argv.includes("--from-existing")) {
    await rebuildGifFromExisting();
    return;
  }
  await captureLive();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
