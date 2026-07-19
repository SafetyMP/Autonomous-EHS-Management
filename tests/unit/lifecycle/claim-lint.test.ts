// ADR-S-001 (R-005) — unit test for scripts/claim-lint.mjs.
// The script is a .mjs ESM module; import it dynamically to keep vitest's
// TS resolver happy across Node/Vite versions.

import { describe, expect, it } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRIPT_URL = pathToFileURL(
  path.resolve(__dirname, "../../../scripts/claim-lint.mjs"),
).href;

type ClaimLintModule = {
  BANNED_PHRASES: ReadonlyArray<{
    id: string;
    phrase: string;
    pattern: string;
  }>;
  DEFAULT_TARGETS: ReadonlyArray<string>;
  findViolations: (
    content: string,
    label?: string,
  ) => ReadonlyArray<{
    file: string;
    line: number;
    phrase: string;
    id: string;
    text: string;
  }>;
};

const loadModule = async (): Promise<ClaimLintModule> => {
  return (await import(SCRIPT_URL)) as ClaimLintModule;
};

describe("claim-lint banned phrase detection", () => {
  it("flags all eight seed banned phrases in positive claims", async () => {
    const mod = await loadModule();
    const sample = [
      "Our OSHA-ready platform ships filing-ready exports.",
      "Certification body support built in.",
      "Tier2 Submit envelope automation.",
      "Agency SoR for injury logs.",
      "One-click erase everything on demand.",
      "GDPR-compliant automated erasure workflow.",
      "The autonomous AI EHS makes decisions for you.",
    ].join("\n");
    const findings = mod.findViolations(sample, "sample.md");
    const ids = new Set(findings.map((v) => v.id));
    for (const entry of mod.BANNED_PHRASES) {
      expect(ids.has(entry.id), `expected banned phrase ${entry.id} to be flagged`).toBe(true);
    }
  });

  it("does not flag banned phrases inside a claim-lint:ignore fence", async () => {
    const mod = await loadModule();
    const sample = [
      "<!-- claim-lint:ignore-start reason=\"documented prohibition column\" -->",
      "Prohibited: filing-ready | OSHA-ready | Tier2 Submit | certification body.",
      "<!-- claim-lint:ignore-end -->",
    ].join("\n");
    const findings = mod.findViolations(sample, "sample.md");
    expect(findings).toEqual([]);
  });

  it("resumes scanning after a fence closes", async () => {
    const mod = await loadModule();
    const sample = [
      "<!-- claim-lint:ignore-start -->",
      "Prohibited phrase: filing-ready.",
      "<!-- claim-lint:ignore-end -->",
      "Marketing copy: this platform is OSHA-ready today.",
    ].join("\n");
    const findings = mod.findViolations(sample, "sample.md");
    expect(findings.map((v) => v.id)).toEqual(["osha-ready"]);
  });

  it("targets exactly the four buyer-facing docs listed in ADR-S-001", async () => {
    const mod = await loadModule();
    expect([...mod.DEFAULT_TARGETS]).toEqual([
      "README.md",
      "docs/procurement-readiness.md",
      "docs/regulatory-posture-boundary.md",
      "COMPLIANCE.md",
    ]);
  });

  it("returns empty findings when input contains none of the phrases", async () => {
    const mod = await loadModule();
    const sample = [
      "IMS-style EHS console for autonomous compliance operations.",
      "Programme register for environmental permit renewals.",
      "OSHA-oriented sidecar for internal analytics.",
      "Governance-aligned DSAR intake.",
    ].join("\n");
    const findings = mod.findViolations(sample, "sample.md");
    expect(findings).toEqual([]);
  });
});
