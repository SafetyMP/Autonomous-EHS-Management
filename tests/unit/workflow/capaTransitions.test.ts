import { describe, expect, it } from "vitest";
import { correctiveActionStatusEnum } from "@/server/db/schema";
import { allowedCapaTransition } from "@/lib/workflow/capaTransitions";

const statuses = correctiveActionStatusEnum.enumValues;

const allowedPairs: readonly (readonly [
  (typeof statuses)[number],
  (typeof statuses)[number],
])[] = [
  ["pending_approval", "planned"],
  ["planned", "in_progress"],
  ["in_progress", "completed"],
  ["completed", "verified"],
];

describe("allowedCapaTransition", () => {
  it("allows every enumerated CAPA chain edge exactly as specified", () => {
    for (const [from, to] of allowedPairs) {
      expect(allowedCapaTransition(from, to)).toBe(true);
    }
  });

  it("forbids all other ordered pairs among schema statuses", () => {
    for (const from of statuses) {
      for (const to of statuses) {
        const expects = allowedPairs.some(([f, t]) => f === from && t === to);
        expect(allowedCapaTransition(from, to)).toBe(expects);
      }
    }
  });

  it("verified is terminal", () => {
    for (const to of statuses) {
      expect(allowedCapaTransition("verified", to)).toBe(false);
    }
  });

  it("treats unknown runtime `from` as no outbound transitions", () => {
    const junk: unknown[] = ["", "archived", "pending_approval "];
    for (const fakeFrom of junk) {
      for (const to of statuses) {
        expect(
          allowedCapaTransition(
            fakeFrom as (typeof statuses)[number],
            to,
          ),
        ).toBe(false);
      }
    }
  });

  it("never allows backward jumps for known labels", () => {
    expect(allowedCapaTransition("planned", "pending_approval")).toBe(false);
    expect(allowedCapaTransition("verified", "completed")).toBe(false);
  });
});
