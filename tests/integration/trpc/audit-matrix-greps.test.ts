import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ADR-S-003 / R-008 — Vitest mirror of `npm run audit:matrix-greps`.
 * Fails when a router gains `.mutation(` without writeAuditLog or a documented one-hop callee.
 */
const ROOT = resolve(__dirname, "../../..");

describe("audit-matrix-greps (R-008)", () => {
  it("exits 0 for current router inventory", () => {
    const out = execFileSync("bash", [resolve(ROOT, "scripts/audit-matrix-greps.sh")], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    expect(out).toMatch(/audit-matrix-greps: OK/);
  });
});
