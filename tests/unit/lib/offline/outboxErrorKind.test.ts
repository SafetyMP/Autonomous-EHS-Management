import { describe, expect, it } from "vitest";
import {
  classifyOutboxError,
  outboxErrorKindLabel,
} from "@/lib/offline/outboxErrorKind";

describe("classifyOutboxError", () => {
  it("detects conflict-style server messages", () => {
    expect(classifyOutboxError("Inspection not found")).toBe("conflict");
    expect(classifyOutboxError("Invalid transition from completed to scheduled")).toBe("conflict");
  });

  it("detects validation errors", () => {
    expect(classifyOutboxError("Validation failed: title required")).toBe("validation");
  });

  it("labels kinds for operators", () => {
    expect(outboxErrorKindLabel("conflict")).toContain("conflict");
  });
});
