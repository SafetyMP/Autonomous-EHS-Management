import { describe, expect, it } from "vitest";
import { incidentStatusEnum } from "@/server/db/schema";
import { allowedIncidentTransition } from "@/lib/workflow/incidentTransitions";

const statuses = incidentStatusEnum.enumValues;

const allowedPairs: readonly (readonly [
  (typeof statuses)[number],
  (typeof statuses)[number],
])[] = [
  ["open", "investigating"],
  ["investigating", "closed"],
];

describe("allowedIncidentTransition", () => {
  it("allows every enumerated forward edge exactly as specified", () => {
    for (const [from, to] of allowedPairs) {
      expect(allowedIncidentTransition(from, to)).toBe(true);
    }
  });

  it("forbids all other ordered pairs among known statuses", () => {
    for (const from of statuses) {
      for (const to of statuses) {
        const expects = allowedPairs.some(([f, t]) => f === from && t === to);
        expect(allowedIncidentTransition(from, to)).toBe(expects);
      }
    }
  });

  it("closes terminal state: nothing leaves closed", () => {
    for (const to of statuses) {
      expect(allowedIncidentTransition("closed", to)).toBe(false);
    }
  });

  it("treats unknown runtime `from` as no transitions", () => {
    const junk: unknown[] = ["", "deleted", "\nopen", String.fromCharCode(0)];
    for (const fakeFrom of junk) {
      for (const to of statuses) {
        expect(
          allowedIncidentTransition(
            fakeFrom as (typeof statuses)[number],
            to,
          ),
        ).toBe(false);
      }
    }
  });

  it("treats unknown runtime `to` as disallowed unless in map for known from", () => {
    expect(allowedIncidentTransition("open", "deleted" as (typeof statuses)[number])).toBe(false);
    expect(allowedIncidentTransition("investigating", "open" as (typeof statuses)[number])).toBe(false);
  });
});
