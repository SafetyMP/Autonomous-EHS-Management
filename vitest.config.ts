import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/mocks/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    setupFiles: [
      "./tests/vitest-env-preload.cjs",
      "./tests/vitest.setup.ts",
    ],
    include: [
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.test.ts",
      "tests/evals/**/*.eval.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/error.tsx",
        "src/app/**/not-found.tsx",
        "src/app/**/page.tsx",
        "src/app/**/*-client.tsx",
        "src/app/**/*-list-client.tsx",
        "src/instrumentation.ts",
      ],
      // Soft floors under full-src baseline (~23% lines) — catch regressions, not aspirational targets.
      thresholds: {
        lines: 22,
        statements: 22,
        functions: 17,
        branches: 15,
      },
    },
  },
});
