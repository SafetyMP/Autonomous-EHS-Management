import path from "node:path";
import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";

dotenv.config({ path: path.join(__dirname, ".env.ci") });

export default defineConfig({
  testDir: path.join(__dirname, "tests/e2e"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  webServer: {
    command: "npm run dev -- --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: [
        "**/smoke/core-spine-*.spec.ts",
        "**/a11y/**",
        "**/density/**",
        "**/visual/**",
      ],
      use: { ...devices["Desktop Chrome"] },
    },
    /**
     * Named Core-spine suite (R-007). Included in `npm run test:e2e:smoke`
     * (`--grep @smoke`). Target alone with `npx playwright test --project=core-spine`.
     */
    {
      name: "core-spine",
      testMatch: "**/smoke/core-spine-*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    /**
     * Dedicated a11y suite (ADR-UX-004 / AC-007 / AC-020).
     * Invoked separately — not part of default `@smoke` grep.
     * `npx playwright test --project=a11y` or `npm run test:e2e:a11y`.
     */
    {
      name: "a11y",
      testMatch: "**/a11y/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    /**
     * Calm Focus density suite (ADR-UX-006 / AC-CF-D004 / AC-CF-D005).
     * Invoked separately — not part of default `@smoke` grep.
     * `npx playwright test --project=density` or path `tests/e2e/density`.
     */
    {
      name: "density",
      testMatch: "**/density/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    /**
     * Calm Focus visual digest suite (ADR-UX-007 / AC-CF-V010).
     * Invoked separately — not part of default `@smoke` grep.
     * `npx playwright test --project=visual` or `npx playwright test tests/e2e/visual`.
     */
    {
      name: "visual",
      testMatch: "**/visual/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
