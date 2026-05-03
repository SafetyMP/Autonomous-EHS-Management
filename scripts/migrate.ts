/**
 * Applies Drizzle migrations with clear pg errors (wrapper around drizzle migrator).
 * Uses `pg` and `DATABASE_URL` from `.env.local` / `.env`.
 */
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { loadEnvFiles } from "./lib/load-env";

loadEnvFiles();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    console.error(
      "DATABASE_URL is required. Copy .env.demo.example to .env.local or export DATABASE_URL.",
    );
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool);
  try {
    await migrate(db, {
      migrationsFolder: resolve(process.cwd(), "drizzle/migrations"),
    });
    console.log("Migrations applied successfully.");
  } catch (e) {
    console.error("Migration failed:");
    console.error(e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
