/**
 * Signed-in density gate credentials (AC-CF-D004 / AC-CF-D005).
 *
 * `.env.ci` injects fixture emails even without a local DB. Treat credentials as
 * usable only when CI is set or the operator opts in with PLAYWRIGHT_E2E_FORCE=1.
 *
 * Supervisor: PLAYWRIGHT_E2E_EMAIL / PLAYWRIGHT_E2E_PASSWORD (CI admin seed).
 * Contributor: PLAYWRIGHT_E2E_CONTRIBUTOR_EMAIL / PLAYWRIGHT_E2E_CONTRIBUTOR_PASSWORD
 *   (defaults: e2e.contributor@ci.local + same password as supervisor).
 */

export const e2eEmail = process.env.PLAYWRIGHT_E2E_EMAIL;
export const e2ePassword = process.env.PLAYWRIGHT_E2E_PASSWORD;

export const e2eContributorEmail =
  process.env.PLAYWRIGHT_E2E_CONTRIBUTOR_EMAIL?.trim() ||
  process.env.CI_E2E_CONTRIBUTOR_EMAIL?.trim() ||
  "e2e.contributor@ci.local";

export const e2eContributorPassword =
  process.env.PLAYWRIGHT_E2E_CONTRIBUTOR_PASSWORD?.trim() ||
  process.env.CI_E2E_CONTRIBUTOR_PASSWORD?.trim() ||
  e2ePassword;

const authOptIn =
  process.env.CI === "true" ||
  process.env.CI === "1" ||
  process.env.PLAYWRIGHT_E2E_FORCE === "1";

export const hasE2eCredentials = Boolean(e2eEmail && e2ePassword && authOptIn);

export const hasContributorCredentials = Boolean(
  e2eContributorEmail && e2eContributorPassword && authOptIn,
);

export const skipWithoutCredentials =
  "Signed-in density requires PLAYWRIGHT_E2E_EMAIL/PASSWORD plus CI=true or PLAYWRIGHT_E2E_FORCE=1 (and a migrated/seeded DB).";

export const skipWithoutContributor =
  "Contributor density requires CI desk_contributor seed (db:seed:ci) plus PLAYWRIGHT_E2E_CONTRIBUTOR_* or defaults.";
