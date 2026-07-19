/**
 * Shared gate for signed-in a11y routes.
 *
 * `playwright.config.ts` loads `.env.ci`, which injects CI fixture emails even
 * when no Postgres role/DB exists locally. Treat credentials as usable only when
 * CI is set or the operator opts in with PLAYWRIGHT_E2E_FORCE=1 — otherwise skip
 * gracefully (AC-007 wiring) instead of timing out on auth.
 */
export const e2eEmail = process.env.PLAYWRIGHT_E2E_EMAIL;
export const e2ePassword = process.env.PLAYWRIGHT_E2E_PASSWORD;

const authOptIn =
  process.env.CI === "true" ||
  process.env.CI === "1" ||
  process.env.PLAYWRIGHT_E2E_FORCE === "1";

export const hasE2eCredentials = Boolean(e2eEmail && e2ePassword && authOptIn);

export const skipWithoutCredentials =
  "Signed-in a11y requires PLAYWRIGHT_E2E_EMAIL/PASSWORD plus CI=true or PLAYWRIGHT_E2E_FORCE=1 (and a migrated/seeded DB).";
