/**
 * `.env.ci` / `SKIP_ENV_VALIDATION` are applied in `vitest-env-preload.cjs` (runs first).
 * Publish validated env for `readValidatedEnv()` — avoids `require` of `.ts` under Vitest.
 */
import { env } from "@/lib/env";

const g = globalThis as typeof globalThis & {
  __EHS_VALIDATED_ENV__: typeof env;
};
g.__EHS_VALIDATED_ENV__ = env;
