import { config } from "dotenv";
import { resolve } from "node:path";

/**
 * Loads `.env.local` then `.env` from the repo root (explicit paths so static
 * imports of `src/server/db` still see DATABASE_URL in scripts).
 */
export function loadEnvFiles(): void {
  const root = resolve(process.cwd());
  config({ path: resolve(root, ".env.local") });
  config({ path: resolve(root, ".env") });
}
