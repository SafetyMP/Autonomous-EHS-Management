import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { genericOAuth } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import {
  authAccount,
  authSession,
  authUser,
  authVerification,
} from "@/server/db/schema";

const oidcPlugin =
  env.OIDC_DISCOVERY_URL && env.OIDC_CLIENT_ID && env.OIDC_CLIENT_SECRET
    ? genericOAuth({
        config: [
          {
            providerId: env.OIDC_PROVIDER_ID ?? "enterprise-oidc",
            discoveryUrl: env.OIDC_DISCOVERY_URL,
            clientId: env.OIDC_CLIENT_ID,
            clientSecret: env.OIDC_CLIENT_SECRET,
            scopes: ["openid", "email", "profile"],
            requireIssuerValidation: true,
          },
        ],
      })
    : null;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.BETTER_AUTH_URL, env.NEXT_PUBLIC_APP_URL],
  plugins: [nextCookies(), ...(oidcPlugin ? [oidcPlugin] : [])],
});
