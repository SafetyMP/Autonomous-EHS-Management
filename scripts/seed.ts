/**
 * Seeds RBAC, demo org/site, and admin membership for SEED_ADMIN_EMAIL.
 * Run after migrations and after the user has signed up once (Better Auth user row exists).
 *
 * Usage: SEED_ADMIN_EMAIL=you@corp.com npx tsx scripts/seed.ts
 */
import { loadEnvFiles } from "./lib/load-env";

loadEnvFiles();

import { ensureRbacForUser } from "./lib/seed-shared";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  if (!email) {
    console.error("Set SEED_ADMIN_EMAIL to your signed-up user email.");
    process.exit(1);
  }

  const { db } = await import("../src/server/db");
  await ensureRbacForUser(db, email);
  console.log(`Seed complete. User ${email} linked to demo org as administrator.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
