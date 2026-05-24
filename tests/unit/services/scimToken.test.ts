import { describe, expect, it } from "vitest";
import {
  generateScimBearerToken,
  hashScimBearerToken,
  parseScimAuthorizationHeader,
} from "@/server/services/scim/scimToken";

describe("scimToken", () => {
  it("hashes bearer tokens deterministically", () => {
    const h1 = hashScimBearerToken("test-token-1234567890");
    const h2 = hashScimBearerToken("test-token-1234567890");
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it("generates tokens of sufficient length", () => {
    expect(generateScimBearerToken().length).toBeGreaterThan(20);
  });

  it("parses Authorization header", () => {
    expect(parseScimAuthorizationHeader("Bearer abcdefghijklmnop")).toBe("abcdefghijklmnop");
    expect(parseScimAuthorizationHeader("Basic x")).toBeNull();
  });
});
