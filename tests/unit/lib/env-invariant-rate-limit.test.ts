import { describe, expect, it } from "vitest";
import {
  rateLimitBackendPolicyViolation,
  type EnvInvariantVars,
} from "@/lib/env";

function base(overrides: EnvInvariantVars = {}): EnvInvariantVars {
  return { NODE_ENV: "development", ...overrides };
}

describe("rateLimitBackendPolicyViolation (R-009)", () => {
  it("allows missing Upstash in development", () => {
    expect(rateLimitBackendPolicyViolation(base({ NODE_ENV: "development" }))).toBeNull();
    expect(rateLimitBackendPolicyViolation(base({ NODE_ENV: "test" }))).toBeNull();
  });

  it("hard-fails non_dev without Upstash (self-host production)", () => {
    const msg = rateLimitBackendPolicyViolation(base({ NODE_ENV: "production" }));
    expect(msg).toMatch(/Rate limiting backend is required/);
    expect(msg).toMatch(/UPSTASH_REDIS_REST/);
  });

  it("hard-fails staging APP_ENV without Upstash (not Vercel-only)", () => {
    expect(
      rateLimitBackendPolicyViolation(
        base({ NODE_ENV: "development", APP_ENV: "staging" }),
      ),
    ).toMatch(/Rate limiting backend is required/);
  });

  it("hard-fails VERCEL_ENV=preview without Upstash", () => {
    expect(
      rateLimitBackendPolicyViolation(
        base({ NODE_ENV: "development", VERCEL_ENV: "preview" }),
      ),
    ).toMatch(/Rate limiting backend is required/);
  });

  it("passes when both Upstash URL and token are set", () => {
    expect(
      rateLimitBackendPolicyViolation(
        base({
          NODE_ENV: "production",
          UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
          UPSTASH_REDIS_REST_TOKEN: "token-value",
        }),
      ),
    ).toBeNull();
  });

  it("allows RATE_LIMIT_DISABLED=true emergency bridge", () => {
    expect(
      rateLimitBackendPolicyViolation(
        base({ NODE_ENV: "production", RATE_LIMIT_DISABLED: "true" }),
      ),
    ).toBeNull();
  });

  it("still fails when only URL or only token is set", () => {
    expect(
      rateLimitBackendPolicyViolation(
        base({
          NODE_ENV: "production",
          UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        }),
      ),
    ).toMatch(/Rate limiting backend is required/);
    expect(
      rateLimitBackendPolicyViolation(
        base({ NODE_ENV: "production", UPSTASH_REDIS_REST_TOKEN: "token-value" }),
      ),
    ).toMatch(/Rate limiting backend is required/);
  });
});
