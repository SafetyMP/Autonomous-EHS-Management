import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const configuredBaseURL = process.env.DEMO_BASE_URL;
const baseURL = configuredBaseURL
  ? `${configuredBaseURL.replace(/\/$/, "")}/`
  : "http://127.0.0.1:4173/demo/";

/** Static walkthrough verification, independent of the authenticated EHS server and database. */
export default defineConfig({
  testDir: path.join(__dirname, "tests/demo-pages"),
  outputDir: path.join(__dirname, "test-results/demo-pages"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Four-worker local runs intermittently reset static asset connections.
  // Serialize this short suite; assertions and page coverage remain unchanged.
  workers: 1,
  reporter: "list",
  webServer: configuredBaseURL ? undefined : {
    command: "python3 -m http.server 4173 --bind 127.0.0.1",
    url: "http://127.0.0.1:4173/demo/",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  use: {
    // A non-root deployment catches absolute asset paths that break GitHub project Pages.
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "demo-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
