import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("enterprise OIDC client transport", () => {
  it("starts discovery-provider login through the Better Auth 1.7 social endpoint", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ url: "https://identity.example/authorize", redirect: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const { authClient, enterpriseOidcProviderId } = await import("@/lib/auth-client");
    const result = await authClient.signIn.social({
      provider: enterpriseOidcProviderId,
      callbackURL: "http://localhost:3000/dashboard",
    });
    expect(result.error).toBeNull();
    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0]!;
    expect(String(url)).toBe("http://localhost:3000/api/auth/sign-in/social");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toMatchObject({
      provider: enterpriseOidcProviderId,
      callbackURL: "http://localhost:3000/dashboard",
    });
  });
});
