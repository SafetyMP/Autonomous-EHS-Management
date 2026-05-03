import { describe, expect, it } from "vitest";
import { allowedWorkPermitTransition } from "@/lib/workflow/permitTransitions";

describe("allowedWorkPermitTransition", () => {
  it("allows draft→pending or cancel", () => {
    expect(allowedWorkPermitTransition({ status: "draft" }, "pending_approval")).toBe(true);
    expect(allowedWorkPermitTransition({ status: "draft" }, "cancelled")).toBe(true);
    expect(allowedWorkPermitTransition({ status: "draft" }, "active")).toBe(false);
  });

  it("allows pending approval→cancel only", () => {
    expect(allowedWorkPermitTransition({ status: "pending_approval" }, "cancelled")).toBe(true);
    expect(allowedWorkPermitTransition({ status: "pending_approval" }, "draft")).toBe(false);
  });

  it("allows active→complete cancel expire", () => {
    expect(allowedWorkPermitTransition({ status: "active" }, "completed")).toBe(true);
    expect(allowedWorkPermitTransition({ status: "active" }, "cancelled")).toBe(true);
    expect(allowedWorkPermitTransition({ status: "active" }, "expired")).toBe(true);
  });

  it("blocks terminal statuses", () => {
    expect(allowedWorkPermitTransition({ status: "rejected" }, "draft")).toBe(false);
    expect(allowedWorkPermitTransition({ status: "completed" }, "active")).toBe(false);
  });
});
