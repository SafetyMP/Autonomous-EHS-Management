import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: path.join(__dirname, "tests/e2e"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  webServer: {
    command: "SKIP_ENV_VALIDATION=1 DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/db BETTER_AUTH_SECRET=01234567890123456789012345678901 BETTER_AUTH_URL=http://127.0.0.1:3000 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 npm run dev -- --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
