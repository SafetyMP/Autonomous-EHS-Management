import { describe, expect, it } from "vitest";
import {
  buildFieldPhotoAppendix,
  INTAKE_TEXT_MAX_LEN,
  wouldExceedIntakeTextLimit,
} from "@/lib/field/compressIntakeImage";

describe("compressIntakeImage helpers", () => {
  it("buildFieldPhotoAppendix embeds data URLs", () => {
    const a = buildFieldPhotoAppendix([{ fileName: "a.jpg", dataUrl: "data:image/jpeg;base64,abc" }]);
    expect(a).toContain("Field intake photos");
    expect(a).toContain("Photo 1");
    expect(a).toContain("data:image/jpeg;base64,abc");
  });

  it("wouldExceedIntakeTextLimit respects max length", () => {
    const base = "x".repeat(INTAKE_TEXT_MAX_LEN - 10);
    expect(wouldExceedIntakeTextLimit(base, "yyyyy")).toBe(false);
    expect(wouldExceedIntakeTextLimit(base, "yyyyyyyyyyy")).toBe(true);
  });
});
