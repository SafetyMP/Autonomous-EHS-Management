import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    /** Set to `"1"` when using local Docker Postgres (node-postgres pool). Omit for Neon serverless. */
    DATABASE_USE_PG: z.enum(["0", "1"]).optional(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_BASE_URL: z.string().url().optional(),
    CRON_SECRET: z.string().optional(),
    AI_FALLBACK_MODEL: z.string().optional(),
    AI_EMBEDDING_MODEL: z.string().optional(),
    /** When `"true"`, enables demo quick sign-in (server) and related UX flags. Never enable in production without `DEMO_ALLOW_PRODUCTION`. */
    DEMO_MODE: z.string().optional(),
    /**
     * Set to `"true"` only if demo sign-in must work with `NODE_ENV=production` (discouraged).
     * Otherwise `signInAsDemoAdmin` returns an error in production even when `DEMO_MODE=true`.
     */
    DEMO_ALLOW_PRODUCTION: z.literal("true").optional(),
    /** When `"true"` with DEMO_MODE, tRPC mutations return FORBIDDEN (browse-only demo). */
    DEMO_READ_ONLY: z.string().optional(),
    DEMO_ADMIN_EMAIL: z.string().email().optional(),
    DEMO_ADMIN_PASSWORD: z.string().optional(),
    /** OIDC / enterprise SSO (optional). When all three are set, Generic OAuth is enabled. */
    OIDC_DISCOVERY_URL: z.string().url().optional(),
    OIDC_CLIENT_ID: z.string().optional(),
    OIDC_CLIENT_SECRET: z.string().optional(),
    OIDC_PROVIDER_ID: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    /** When "1", sign-in shows enterprise SSO button if server OIDC env is configured. */
    NEXT_PUBLIC_ENTERPRISE_SSO: z.string().optional(),
    /** Must match server OIDC_PROVIDER_ID default when using SSO button */
    NEXT_PUBLIC_OIDC_PROVIDER_ID: z.string().optional(),
    /** When `"1"`, sign-in shows “Try demo admin” (non-secret; credentials stay server-only). */
    NEXT_PUBLIC_DEMO_MODE: z.string().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_USE_PG: process.env.DATABASE_USE_PG,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    AI_FALLBACK_MODEL: process.env.AI_FALLBACK_MODEL,
    AI_EMBEDDING_MODEL: process.env.AI_EMBEDDING_MODEL,
    DEMO_MODE: process.env.DEMO_MODE,
    DEMO_ALLOW_PRODUCTION: process.env.DEMO_ALLOW_PRODUCTION,
    DEMO_READ_ONLY: process.env.DEMO_READ_ONLY,
    DEMO_ADMIN_EMAIL: process.env.DEMO_ADMIN_EMAIL,
    DEMO_ADMIN_PASSWORD: process.env.DEMO_ADMIN_PASSWORD,
    OIDC_DISCOVERY_URL: process.env.OIDC_DISCOVERY_URL,
    OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
    OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
    OIDC_PROVIDER_ID: process.env.OIDC_PROVIDER_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ENTERPRISE_SSO: process.env.NEXT_PUBLIC_ENTERPRISE_SSO,
    NEXT_PUBLIC_OIDC_PROVIDER_ID: process.env.NEXT_PUBLIC_OIDC_PROVIDER_ID,
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
