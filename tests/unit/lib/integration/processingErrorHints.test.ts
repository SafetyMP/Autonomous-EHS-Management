import { describe, expect, it } from "vitest";
import { hintForIntegrationProcessingError } from "@/lib/integration/processingErrorHints";

describe("hintForIntegrationProcessingError", () => {
  it("returns worker email hint", () => {
    const hint = hintForIntegrationProcessingError("No user matches workerEmail foo@example.com");
    expect(hint?.title).toBe("Worker email not found in EHS");
  });

  it("returns membership hint", () => {
    const hint = hintForIntegrationProcessingError("User is not a member of this organization");
    expect(hint?.title).toBe("User exists but lacks org membership");
  });

  it("returns generic fallback for unknown errors", () => {
    const hint = hintForIntegrationProcessingError("Unexpected parser failure");
    expect(hint?.title).toBe("Processing error");
    expect(hint?.remediation).toContain("Retry");
  });

  it("returns null for empty input", () => {
    expect(hintForIntegrationProcessingError(null)).toBeNull();
  });
});
