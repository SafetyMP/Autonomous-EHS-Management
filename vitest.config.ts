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
  },
});
