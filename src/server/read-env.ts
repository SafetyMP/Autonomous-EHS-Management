/**
 * Lazy, runtime `require` of validated env for Next/webpack (build workers cannot rely on Vitest).
 * Under Vitest, `require("../lib/env")` skips Vite transforms and cannot load `.ts` — use the global
 * seeded from `tests/vitest.setup.ts` after `vitest-env-preload.cjs`.
 */
export type ValidatedEnv = typeof import("@/lib/env").env;

export function readValidatedEnv(): ValidatedEnv {
  if (process.env.VITEST === "true") {
    const g = globalThis as typeof globalThis & {
      __EHS_VALIDATED_ENV__?: ValidatedEnv;
    };
    if (!g.__EHS_VALIDATED_ENV__) {
      throw new Error(
        "Vitest: __EHS_VALIDATED_ENV__ missing — check setupFiles order (vitest-env-preload.cjs then vitest.setup.ts).",
      );
    }
    return g.__EHS_VALIDATED_ENV__;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../lib/env").env as ValidatedEnv;
}
