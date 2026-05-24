import { describe, expect, it } from "vitest";
import { claimValuesFromPayload, decodeJwtPayload } from "@/lib/oidc/claimParser";

describe("decodeJwtPayload", () => {
  it("decodes a minimal JWT payload", () => {
    const payload = Buffer.from(JSON.stringify({ groups: ["EHS-Plant-A"], sub: "u1" })).toString(
      "base64url",
    );
    const token = `header.${payload}.sig`;
    const decoded = decodeJwtPayload(token);
    expect(decoded?.sub).toBe("u1");
    expect(claimValuesFromPayload(decoded!, "groups")).toEqual(["EHS-Plant-A"]);
  });

  it("returns null for malformed token", () => {
    expect(decodeJwtPayload("not-a-jwt")).toBeNull();
  });
});

describe("claimValuesFromPayload", () => {
  it("handles scalar and array claims", () => {
    expect(claimValuesFromPayload({ groups: "solo" }, "groups")).toEqual(["solo"]);
    expect(claimValuesFromPayload({ groups: ["a", "b"] }, "groups")).toEqual(["a", "b"]);
    expect(claimValuesFromPayload({}, "groups")).toEqual([]);
  });
});
