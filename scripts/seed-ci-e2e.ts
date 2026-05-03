/**
 * CI-only bootstrap: Better Auth user + full RBAC for Playwright signed-in smoke tests.
 * Requires DATABASE_URL, BETTER_AUTH_*, CI_E2E_USER_EMAIL, CI_E2E_USER_PASSWORD (see ci.yml job env).
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { loadEnvFiles } from "./lib/load-env";
import { ensureRbacForUser } from "./lib/seed-shared";

config({ path: resolve(process.cwd(), ".env.ci") });
loadEnvFiles();

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
  const { authUser } = await import("../src/server/db/schema");

  const [existing] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, emailRaw))
    .limit(1);

  if (!existing) {
    const { auth } = await import("../src/server/auth");
    await auth.api.signUpEmail({
      body: { name, email: emailRaw, password },
      headers: new Headers({ origin }),
    });
    console.log(`Created CI E2E user: ${emailRaw}`);
  } else {
    console.log(`CI E2E user already present: ${emailRaw}`);
  }

  await ensureRbacForUser(db, emailRaw);
  console.log("CI E2E RBAC seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
