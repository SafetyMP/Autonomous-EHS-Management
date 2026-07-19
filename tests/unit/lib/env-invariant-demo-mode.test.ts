import { describe, expect, it } from "vitest";
import {
  demoModePolicyViolation,
  resolveDeployClass,
  type EnvInvariantVars,
} from "@/lib/env";

function base(overrides: EnvInvariantVars = {}): EnvInvariantVars {
  return { NODE_ENV: "development", ...overrides };
}

describe("resolveDeployClass (R-009)", () => {
  it("treats local/test NODE_ENV as development", () => {
    expect(resolveDeployClass(base({ NODE_ENV: "development" }))).toBe("development");
    expect(resolveDeployClass(base({ NODE_ENV: "test" }))).toBe("development");
  });

  it("treats NODE_ENV=production as non_dev (self-host, not Vercel-only)", () => {
    expect(resolveDeployClass(base({ NODE_ENV: "production" }))).toBe("non_dev");
  });

  it("treats VERCEL_ENV production and preview as non_dev", () => {
    expect(
      resolveDeployClass(base({ NODE_ENV: "development", VERCEL_ENV: "production" })),
    ).toBe("non_dev");
    expect(
      resolveDeployClass(base({ NODE_ENV: "development", VERCEL_ENV: "preview" })),
    ).toBe("non_dev");
  });

  it("treats APP_ENV/DEPLOY_ENV staging/pilot/prod as non_dev without Vercel", () => {
    expect(resolveDeployClass(base({ APP_ENV: "staging" }))).toBe("non_dev");
    expect(resolveDeployClass(base({ DEPLOY_ENV: "pilot" }))).toBe("non_dev");
    expect(resolveDeployClass(base({ APP_ENV: "production" }))).toBe("non_dev");
    expect(resolveDeployClass(base({ APP_ENV: "prod" }))).toBe("non_dev");
  });
});

describe("demoModePolicyViolation (R-009)", () => {
  it("allows DEMO_MODE in development", () => {
    expect(
      demoModePolicyViolation(
        base({ NODE_ENV: "development", DEMO_MODE: "true", NEXT_PUBLIC_DEMO_MODE: "1" }),
      ),
    ).toBeNull();
  });

  it("fails closed for DEMO_MODE on NODE_ENV=production without DEMO_ALLOW_PRODUCTION", () => {
    const msg = demoModePolicyViolation(
      base({ NODE_ENV: "production", DEMO_MODE: "true" }),
    );
    expect(msg).toMatch(/DEMO_MODE/);
    expect(msg).toMatch(/DEMO_ALLOW_PRODUCTION/);
  });

  it("fails closed for NEXT_PUBLIC_DEMO_MODE on staging APP_ENV (not Vercel-only)", () => {
    const msg = demoModePolicyViolation(
      base({
        NODE_ENV: "development",
        APP_ENV: "staging",
        NEXT_PUBLIC_DEMO_MODE: "1",
      }),
    );
    expect(msg).toMatch(/NEXT_PUBLIC_DEMO_MODE|DEMO_MODE/);
  });

  it("fails closed for VERCEL_ENV=preview with DEMO_MODE", () => {
    expect(
      demoModePolicyViolation(
        base({ NODE_ENV: "development", VERCEL_ENV: "preview", DEMO_MODE: "true" }),
      ),
    ).toMatch(/cannot be enabled outside development/);
  });

  it("allows non_dev when DEMO_ALLOW_PRODUCTION=true", () => {
    expect(
      demoModePolicyViolation(
        base({
          NODE_ENV: "production",
          DEMO_MODE: "true",
          NEXT_PUBLIC_DEMO_MODE: "true",
          DEMO_ALLOW_PRODUCTION: "true",
        }),
      ),
    ).toBeNull();
  });

  it("allows non_dev when demo flags are unset", () => {
    expect(demoModePolicyViolation(base({ NODE_ENV: "production" }))).toBeNull();
  });
});
