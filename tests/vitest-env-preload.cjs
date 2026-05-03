const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

/** Runs before TS setupFiles so `import { env } from "@/lib/env"` sees injected vars. */
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
