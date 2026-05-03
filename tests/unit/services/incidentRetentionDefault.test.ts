import { describe, expect, it } from "vitest";
import {
  addYearsUtc,
  endOfCalendarYearUtc,
  retainUntilFromPolicyRow,
} from "@/server/services/incidentRetentionDefault";

describe("addYearsUtc", () => {
  it("adds years in UTC without mutating input", () => {
    const from = new Date("2024-06-15T12:00:00.000Z");
    const out = addYearsUtc(from, 5);
    expect(out.toISOString()).toBe("2029-06-15T12:00:00.000Z");
    expect(from.toISOString()).toBe("2024-06-15T12:00:00.000Z");
  });

  it("rolls Feb 29 forward when the target year has no leap day (JS Date semantics)", () => {
    const from = new Date("2024-02-29T00:00:00.000Z");
    const out = addYearsUtc(from, 1);
    expect(out.toISOString()).toBe("2025-03-01T00:00:00.000Z");
  });
});

describe("endOfCalendarYearUtc", () => {
  it("returns last instant of December in UTC", () => {
    const out = endOfCalendarYearUtc(2029);
    expect(out.toISOString()).toBe("2029-12-31T23:59:59.999Z");
  });
});

describe("retainUntilFromPolicyRow", () => {
  it("uses rolling anchor from reference date", () => {
    const ref = new Date("2024-06-15T12:00:00.000Z");
    const out = retainUntilFromPolicyRow(ref, 5, "rolling_from_event");
    expect(out.toISOString()).toBe("2029-06-15T12:00:00.000Z");
  });

  it("uses end of calendar year N years after reference year", () => {
    const ref = new Date("2024-06-15T12:00:00.000Z");
    const out = retainUntilFromPolicyRow(ref, 5, "calendar_year_end");
    expect(out.toISOString()).toBe("2029-12-31T23:59:59.999Z");
  });
});
