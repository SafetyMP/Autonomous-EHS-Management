import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

/**
 * Prefer committed `.env.ci` when present so CI and local runs exercise @t3-oss/env validation.
 * Otherwise skip validation so unit tests do not require a real `.env.local`.
 */
const ciEnvPath = path.join(__dirname, "../.env.ci");
if (fs.existsSync(ciEnvPath)) {
  dotenv.config({ path: ciEnvPath });
}

delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

const hasRequiredEnv =
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.BETTER_AUTH_SECRET) &&
  Boolean(process.env.BETTER_AUTH_URL) &&
  Boolean(process.env.NEXT_PUBLIC_APP_URL);

if (!hasRequiredEnv) {
  process.env.SKIP_ENV_VALIDATION = "1";
}
