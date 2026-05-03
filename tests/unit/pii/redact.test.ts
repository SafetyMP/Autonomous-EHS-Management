import { describe, expect, it } from "vitest";
import { redactForPrompt, redactForRagIngest } from "@/lib/pii/redact";

describe("redactForPrompt", () => {
  it("handles empty input", () => {
    expect(redactForPrompt("")).toBe("");
  });

  it("redacts US-style phone-ish digit runs", () => {
    expect(redactForPrompt("call 415-555-1212")).toMatch(/\[redacted-phone\]/);
    expect(redactForPrompt("call 415.555.1212")).toMatch(/\[redacted-phone\]/);
    expect(redactForPrompt("call 4155551212")).toMatch(/\[redacted-phone\]/);
  });

  it("redacts email-shaped tokens conservatively", () => {
    const out = redactForPrompt("reach me user.name+tag_%@domain.co.uk bye");
    expect(out).not.toContain("user.name+tag_%@domain.co.uk");
    expect(out).toMatch(/\[redacted-email\]/);
  });

  it("applies replacements in deterministic order across mixed PII", () => {
    const input = "a@b.co and 911-867-5309 overlap test";
    const once = redactForPrompt(input);
    const twice = redactForPrompt(input);
    expect(once).toBe(twice);
  });

  it("survives very long repetition without throwing", () => {
    const big = `${"x".repeat(50_000)} a@example.com`;
    expect(() => redactForPrompt(big)).not.toThrow();
    expect(redactForPrompt(big)).toContain("[redacted-email]");
  });

  it("preserves surrogate-pair-bearing text without crashing", () => {
    const s = "😀😀😀 contact at test@demo.org";
    const out = redactForPrompt(s);
    expect(out).toContain("😀😀😀");
    expect(out).toContain("[redacted-email]");
  });

  it("does not redact hyphenated clauses that lack full phone pattern", () => {
    expect(redactForPrompt("12-345")).toBe("12-345");
  });
});

describe("redactForRagIngest", () => {
  it("applies prompt redaction plus SSN pattern", () => {
    const raw =
      "Worker jane@firm.com SSN 123-45-6789 phone 212-555-0199";
    const out = redactForRagIngest(raw);
    expect(out).toContain("[redacted-email]");
    expect(out).toContain("[redacted-phone]");
    expect(out).toContain("[redacted-ssn]");
  });
});
