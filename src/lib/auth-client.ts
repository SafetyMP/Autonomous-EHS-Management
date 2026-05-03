import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

/**
 * In the browser, always use the current origin so preview deployments, aliases,
 * and www/apex mismatches still hit `/api/auth` on the same host. `NEXT_PUBLIC_*`
 * is baked at build time and can point at a different deployment than the tab URL.
 */
function authClientBaseURL(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export const enterpriseOidcProviderId =
  process.env.NEXT_PUBLIC_OIDC_PROVIDER_ID ?? "enterprise-oidc";

export const authClient = createAuthClient({
  baseURL: authClientBaseURL(),
  plugins: [genericOAuthClient()],
});
