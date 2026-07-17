import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { genericOAuth } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { logError } from "@/lib/logger";
import { db } from "@/server/db";
import { readValidatedEnv } from "@/server/read-env";
import {
  authAccount,
  authSession,
  authUser,
  authVerification,
} from "@/server/db/schema";

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function createAuthInstance() {
  const env = readValidatedEnv();
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

  const canonicalBase = env.BETTER_AUTH_URL;
  // This deployment's Vercel hosts only — never trust arbitrary *.vercel.app.
  const deploymentOrigins = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
  ]
    .filter((raw): raw is string => Boolean(raw))
    .map((raw) =>
      raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`,
    );

  const allowedHosts = [
    hostnameFromUrl(env.BETTER_AUTH_URL),
    hostnameFromUrl(env.NEXT_PUBLIC_APP_URL),
    ...deploymentOrigins.map(hostnameFromUrl),
  ].filter((h, i, arr) => h.length > 0 && arr.indexOf(h) === i);

  const trustedOrigins = [
    env.BETTER_AUTH_URL,
    env.NEXT_PUBLIC_APP_URL,
    ...deploymentOrigins,
  ].filter((o, i, arr) => arr.indexOf(o) === i);

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: authUser,
        session: authSession,
        account: authAccount,
        verification: authVerification,
      },
    }),
    databaseHooks: {
      session: {
        create: {
          after: async (session) => {
            try {
              const { provisionOidcJitMembershipIfEnabled } = await import(
                "@/server/services/oidcJitProvisioning"
              );
              await provisionOidcJitMembershipIfEnabled(
                db,
                session.userId as string,
              );
            } catch (e) {
              logError("oidc_jit.session_hook_failed", {
                userId: session.userId,
                error: e instanceof Error ? e.message : String(e),
              });
            }
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: {
      allowedHosts,
      fallback: canonicalBase,
      protocol: "auto",
    },
    trustedOrigins,
    plugins: [nextCookies(), ...(oidcPlugin ? [oidcPlugin] : [])],
  });
}

type AuthSingleton = ReturnType<typeof createAuthInstance>;
let authSingleton: AuthSingleton | undefined;
function getAuthSingleton(): AuthSingleton {
  authSingleton ??= createAuthInstance();
  return authSingleton;
}

export const auth = new Proxy({} as object, {
  has(_target, prop) {
    return prop in getAuthSingleton();
  },
  get(_target, prop, receiver) {
    const real = getAuthSingleton();
    const value = Reflect.get(real, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(real);
    }
    return value;
  },
}) as AuthSingleton;
