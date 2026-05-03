/**
 * Start Docker demo Postgres, wait for health, migrate, seed demo data.
 * Prerequisites: Docker, `.env.local` with DATABASE_URL (see .env.demo.example).
 *
 * Usage: npm run demo:up
 */
import { execSync } from "node:child_process";
import pg from "pg";
import { loadEnvFiles } from "./lib/load-env";

loadEnvFiles();

async function waitForDb(url: string, attempts = 60): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    const pool = new pg.Pool({
      connectionString: url,
      connectionTimeoutMillis: 3000,
    });
    try {
      await pool.query("select 1");
      await pool.end();
      console.log("Postgres is accepting connections.");
      return;
    } catch {
      await pool.end().catch(() => {});
      console.log(`Waiting for Postgres (${i + 1}/${attempts})…`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error(
    "Postgres did not become ready. Try: docker compose -f docker-compose.demo.yml logs",
  );
}

async function main() {
  const composeFile = "docker-compose.demo.yml";
  execSync(`docker compose -f ${composeFile} up -d`, {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    throw new Error(
      "DATABASE_URL missing. Copy .env.demo.example to .env.local (host port 5433 for Docker demo).",
    );
  }

  await waitForDb(url);

  execSync("npm run db:migrate", {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });
  execSync("npm run db:seed:demo", {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });

  console.log("\nDemo stack ready. Next: npm run dev\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
