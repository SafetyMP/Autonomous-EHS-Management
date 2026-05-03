import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

const baseURL = process.env.NEXT_PUBLIC_APP_URL;

export const enterpriseOidcProviderId =
  process.env.NEXT_PUBLIC_OIDC_PROVIDER_ID ?? "enterprise-oidc";

export const authClient = createAuthClient({
  baseURL: baseURL ?? "http://localhost:3000",
  plugins: [genericOAuthClient()],
});
