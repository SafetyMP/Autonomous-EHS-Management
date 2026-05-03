import { describe, expect, it } from "vitest";
import { normalizeCronJobErrorMessage } from "@/server/cron/recordCronRun";

describe("normalizeCronJobErrorMessage", () => {
  it("returns null for null, undefined, and blank-after-trim input", () => {
    expect(normalizeCronJobErrorMessage(undefined)).toBeNull();
    expect(normalizeCronJobErrorMessage(null)).toBeNull();
    expect(normalizeCronJobErrorMessage("   \n")).toBeNull();
  });

  it("trims and collapses internal whitespace", () => {
    expect(normalizeCronJobErrorMessage("  foo\t\n  bar  ")).toBe("foo bar");
  });

  it("truncates to 512 chars", () => {
    const long = "e".repeat(600);
    const out = normalizeCronJobErrorMessage(long);
    expect(out).toHaveLength(512);
    expect(out?.startsWith("e")).toBe(true);
  });
});
