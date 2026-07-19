import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * R-002 — AI proposal-only posture: aiAssistant / aiDrafts must not invoke
 * regulated status-transition mutations (auto-close, auto-verify, decide, etc.).
 */
const ROOT = resolve(__dirname, "../../../..");

const AI_SURFACE_FILES = [
  "src/server/trpc/routers/aiAssistant.ts",
  "src/server/trpc/routers/aiDrafts.ts",
  "src/server/services/ai/ragIntakeDraftPipeline.ts",
] as const;

/** Status / approval transitions that must stay human-driven. */
const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bcapa\.updateStatus\b/,
  /\bincident\.updateStatus\b/,
  /\binspection\.updateStatus\b/,
  /\bpermit\.updateStatus\b/,
  /\bapproval\.decideRequest\b/,
  /\bapproval\.submitCapaPlanApproval\b/,
  /\bapproval\.submitWorkPermitApproval\b/,
  /\.updateStatus\s*\(/,
  /status:\s*["']verified["']/,
  /status:\s*["']closed["']/,
  /status:\s*["']approved["']/,
  /status:\s*["']rejected["']/,
  /from\s*\(\s*correctiveAction\s*\)/,
  /from\s*\(\s*incident\s*\)/,
  /update\s*\(\s*correctiveAction\s*\)/,
  /update\s*\(\s*incident\s*\)/,
  /update\s*\(\s*approvalRequest\s*\)/,
  /update\s*\(\s*approvalStep\s*\)/,
];

describe("AI surfaces — non-transition (R-002)", () => {
  for (const rel of AI_SURFACE_FILES) {
    it(`${rel} does not call regulated status-transition mutations`, () => {
      const src = readFileSync(resolve(ROOT, rel), "utf8");
      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(src, `${rel} matched forbidden ${pattern}`).not.toMatch(pattern);
      }
    });
  }

  it("aiAssistant router comments document proposal-only posture", () => {
    const src = readFileSync(resolve(ROOT, "src/server/trpc/routers/aiAssistant.ts"), "utf8");
    expect(src).toMatch(/proposal only|Mutations to regulated entities are not performed/i);
  });

  it("aiDrafts.applyAspectDraft may persist aspects but not CAPA/incident status", () => {
    const src = readFileSync(resolve(ROOT, "src/server/trpc/routers/aiDrafts.ts"), "utf8");
    expect(src).toMatch(/insert\(environmentalAspect\)/);
    expect(src).not.toMatch(/correctiveAction|approvalRequest|incident\b/);
  });
});
