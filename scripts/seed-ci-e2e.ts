/**
 * CI-only bootstrap: Better Auth users + RBAC for Playwright signed-in smoke tests.
 * Requires DATABASE_URL, BETTER_AUTH_*, CI_E2E_USER_EMAIL, CI_E2E_USER_PASSWORD (see ci.yml job env).
 *
 * Optional desk_contributor (Calm Focus density/visual both-persona gates):
 *   CI_E2E_CONTRIBUTOR_EMAIL (default: e2e.contributor@ci.local)
 *   CI_E2E_CONTRIBUTOR_PASSWORD (default: same as CI_E2E_USER_PASSWORD)
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { loadEnvFiles } from "./lib/load-env";
import { ensureDeskContributorForUser, ensureRbacForUser } from "./lib/seed-shared";

config({ path: resolve(process.cwd(), ".env.ci") });
loadEnvFiles();

async function ensureAuthUser(opts: {
  email: string;
  password: string;
  name: string;
  origin: string;
}): Promise<void> {
  const { db } = await import("../src/server/db");
  const { authUser } = await import("../src/server/db/schema");

  const [existing] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, opts.email))
    .limit(1);

  if (!existing) {
    const { auth } = await import("../src/server/auth");
    await auth.api.signUpEmail({
      body: { name: opts.name, email: opts.email, password: opts.password },
      headers: new Headers({ origin: opts.origin }),
    });
    console.log(`Created CI E2E user: ${opts.email}`);
  } else {
    console.log(`CI E2E user already present: ${opts.email}`);
  }
}

async function main() {
  const emailRaw = process.env.CI_E2E_USER_EMAIL?.trim().toLowerCase();
  const password = process.env.CI_E2E_USER_PASSWORD ?? "";
  if (!emailRaw || !password) {
    console.error("Set CI_E2E_USER_EMAIL and CI_E2E_USER_PASSWORD (see .github/workflows/ci.yml).");
    process.exit(1);
  }

  const origin = process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000";
  const name = process.env.CI_E2E_USER_NAME ?? "CI E2E Admin";

  const { db } = await import("../src/server/db");

  await ensureAuthUser({ email: emailRaw, password, name, origin });
  await ensureRbacForUser(db, emailRaw);
  console.log("CI E2E admin RBAC seed complete.");

  const contributorEmail = (
    process.env.CI_E2E_CONTRIBUTOR_EMAIL?.trim() || "e2e.contributor@ci.local"
  ).toLowerCase();
  const contributorPassword =
    process.env.CI_E2E_CONTRIBUTOR_PASSWORD?.trim() || password;
  const contributorName = process.env.CI_E2E_CONTRIBUTOR_NAME ?? "CI E2E Contributor";

  await ensureAuthUser({
    email: contributorEmail,
    password: contributorPassword,
    name: contributorName,
    origin,
  });
  await ensureDeskContributorForUser(db, contributorEmail);
  console.log(`CI E2E desk_contributor RBAC seed complete: ${contributorEmail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
