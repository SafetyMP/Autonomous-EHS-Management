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
  WCAG3_BANNED_PHRASES: ReadonlyArray<{
    id: string;
    phrase: string;
    pattern: string;
  }>;
  WCAG3_DISCLAIMER: string;
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
  findWcag3Violations: (
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

describe("WCAG 3 claim lint (RR-CF-001 / AC-CF-A003)", () => {
  it("flags forbidden WCAG 3 conformance verbs", async () => {
    const mod = await loadModule();
    const sample = [
      "Our console is WCAG 3 conformant today.",
      "WCAG 3 certified for enterprise buyers.",
      "The product meets WCAG 3 out of the box.",
      "Declared compliant with WCAG 3.",
      "Shipping as WCAG 3 compliant software.",
      "WCAG 3.0 certified portal.",
    ].join("\n");
    const findings = mod.findWcag3Violations(sample, "claim.md");
    const ids = new Set(findings.map((v) => v.id));
    for (const entry of mod.WCAG3_BANNED_PHRASES) {
      expect(
        ids.has(entry.id),
        `expected WCAG3 phrase ${entry.id} to be flagged`,
      ).toBe(true);
    }
  });

  it("skips negative / forbidden-list context and inline code", async () => {
    const mod = await loadModule();
    const sample = [
      "Forbidden: `WCAG 3 conformant` and `WCAG 3 certified`.",
      "No WCAG 3 conformance claims in Gen-1.",
      mod.WCAG3_DISCLAIMER,
      "Do not claim the product is WCAG 3 compliant.",
    ].join("\n");
    const findings = mod.findWcag3Violations(sample, "policy.md");
    expect(findings).toEqual([]);
  });

  it("honours wcag3-claim-lint ignore fences", async () => {
    const mod = await loadModule();
    const sample = [
      "<!-- wcag3-claim-lint:ignore-start -->",
      "Example oversell: WCAG 3 conformant.",
      "<!-- wcag3-claim-lint:ignore-end -->",
      "Live claim: meets WCAG 3.",
    ].join("\n");
    const findings = mod.findWcag3Violations(sample, "sample.md");
    expect(findings.map((v) => v.id)).toEqual(["meets-wcag3"]);
  });
});
