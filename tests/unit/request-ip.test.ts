import { afterEach, describe, expect, it } from "vitest";
import { getClientIpFromHeaders } from "@/lib/request-ip";

describe("getClientIpFromHeaders", () => {
  const prevVercel = process.env.VERCEL;
  const prevVercelEnv = process.env.VERCEL_ENV;
  const prevTrust = process.env.TRUST_PROXY;

  afterEach(() => {
    if (prevVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
    if (prevVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercelEnv;
    if (prevTrust === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = prevTrust;
  });

  it("trusts x-vercel-forwarded-for only on Vercel", () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.TRUST_PROXY;
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.9",
    });
    expect(getClientIpFromHeaders(headers)).toBe("unknown");

    process.env.VERCEL = "1";
    expect(getClientIpFromHeaders(headers)).toBe("203.0.113.9");
  });

  it("uses x-forwarded-for when TRUST_PROXY=1", () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    process.env.TRUST_PROXY = "1";
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.2, 10.0.0.1",
    });
    expect(getClientIpFromHeaders(headers)).toBe("198.51.100.2");
  });
});
