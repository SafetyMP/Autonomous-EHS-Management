import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetSession = vi.hoisted(() =>
  vi.fn(async (): Promise<{ user: { id: string } } | null> => null),
);

vi.mock("@/server/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

import { runDashboardAuthGate } from "@/lib/dashboard-auth-gate";

describe("dashboard auth gate (proxy)", () => {
  beforeEach(() => {
    mockGetSession.mockClear();
    mockGetSession.mockResolvedValue(null);
  });

  it("redirects anonymous users from /dashboard to /sign-in with callbackUrl pathname", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = new NextRequest(new URL("http://localhost:3000/dashboard"));
    const res = await runDashboardAuthGate(req);

    expect(res.status).toBe(307);
    const loc = res.headers.get("location");
    expect(loc).toBeTruthy();
    const u = new URL(loc!, "http://localhost:3000");
    expect(u.pathname).toBe("/sign-in");
    expect(decodeURIComponent(u.searchParams.get("callbackUrl") ?? "")).toBe("/dashboard");
  });

  it("preserves nested dashboard paths in callbackUrl", async () => {
    mockGetSession.mockResolvedValue(null);
    const req = new NextRequest(new URL("http://localhost:3000/dashboard/incidents/new"));
    const res = await runDashboardAuthGate(req);

    expect(res.status).toBe(307);
    const u = new URL(res.headers.get("location")!, "http://localhost:3000");
    expect(decodeURIComponent(u.searchParams.get("callbackUrl") ?? "")).toBe(
      "/dashboard/incidents/new",
    );
  });

  it("redirects authenticated users away from sign-in toward dashboard", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    const req = new NextRequest(new URL("http://localhost:3000/sign-in"));
    const res = await runDashboardAuthGate(req);

    expect(res.status).toBe(307);
    const u = new URL(res.headers.get("location")!, "http://localhost:3000");
    expect(u.pathname).toBe("/dashboard");
    expect(u.searchParams.has("callbackUrl")).toBe(false);
  });

  it("redirects authenticated users away from sign-up toward dashboard", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    const req = new NextRequest(new URL("http://localhost:3000/sign-up"));
    const res = await runDashboardAuthGate(req);

    expect(res.status).toBe(307);
    const u = new URL(res.headers.get("location")!, "http://localhost:3000");
    expect(u.pathname).toBe("/dashboard");
  });

  it("passes through for authenticated dashboard requests", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    const req = new NextRequest(new URL("http://localhost:3000/dashboard/program"));
    const res = await runDashboardAuthGate(req);

    expect(res.status).toBe(200);
  });
});
