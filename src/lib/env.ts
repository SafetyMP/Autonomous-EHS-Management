import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Vercel injects deployment hosts during build/runtime but does not always set
 * `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL`. Without a fallback, env validation fails
 * while collecting route data (e.g. `/api/auth/[...all]`).
 * Custom domains: set `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` explicitly to your canonical HTTPS origin.
 */
function vercelDeploymentOrigin(): string | undefined {
  const raw =
    process.env.VERCEL_URL ?? process.env.VERCEL_BRANCH_URL ?? undefined;
  if (!raw) return undefined;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

/** Next.js sets this while running `next build` (collecting page data). Secrets are often runtime-only on Vercel/Fluid; runtime still validates when this phase is absent. */
const isNextProductionBuild =
  process.env.NEXT_PHASE === "phase-production-build";

export const env = createEnv({
  /**
   * Treat `VAR=` / dashboard empty values as unset so optional URL and min-length
   * fields do not fail builds (e.g. Vercel env UI leaving placeholders blank).
   */
  emptyStringAsUndefined: true,
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
    /** Set to `"true"` to JIT-link OAuth users to `OIDC_JIT_DEFAULT_ORG_ID` (see docs/OIDC_JIT_PROVISIONING.md). */
    OIDC_JIT_ENABLED: z.literal("true").optional(),
    /** Existing organization UUID for JIT membership when `OIDC_JIT_ENABLED=true`. */
    OIDC_JIT_DEFAULT_ORG_ID: z.string().uuid().optional(),
    /** Role slug within that org (default `admin`). */
    OIDC_JIT_ROLE_SLUG: z.string().min(1).max(64).optional(),
    /** Shared secret for `POST /api/integration/inbound` (LMS + HRIS webhooks). Optional until route is used. */
    INTEGRATION_INBOUND_SECRET: z.string().min(16).optional(),
    /** Optional HTTPS webhook (e.g. Slack incoming) for cron handler failures. */
    CRON_FAILURE_WEBHOOK_URL: z.string().url().optional(),
    /** When `"true"`, dev logging enqueue path is active (see docs/JOB_QUEUE.md); durable queue not wired yet. */
    JOB_QUEUE_ENABLED: z.literal("true").optional(),
    /** When `"true"`, enqueue uses pg-boss (requires worker: `npm run job:worker`). */
    PG_BOSS_ENABLED: z.literal("true").optional(),
    /** Reserved for pg-boss schema name (documentation / future use). */
    PG_BOSS_SCHEMA: z.string().min(1).max(64).optional(),
    /** Per-org cap on Context Sync REST reads per UTC day (requires Upstash). 0 or unset = disabled. */
    CONTEXT_SYNC_ORG_DAILY_READ_LIMIT: z.coerce.number().int().min(0).max(10_000_000).optional(),
    /** Hard cap on provenance API `limit` query param (default 200). */
    CONTEXT_SYNC_PROVENANCE_MAX_LIMIT: z.coerce.number().int().min(20).max(500).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    /** When "1", sign-in shows enterprise SSO button if server OIDC env is configured. */
    NEXT_PUBLIC_ENTERPRISE_SSO: z.string().optional(),
    /** Must match server OIDC_PROVIDER_ID default when using SSO button */
    NEXT_PUBLIC_OIDC_PROVIDER_ID: z.string().optional(),
    /** When `"1"`, sign-in shows “Try demo admin” (non-secret; credentials stay server-only). */
    NEXT_PUBLIC_DEMO_MODE: z.string().optional(),
    /** When `"1"`, queued offline submits for incidents/observations sync when back online (`src/lib/offline/fieldOutbox.ts`). */
    NEXT_PUBLIC_FIELD_OUTBOX: z.enum(["0", "1"]).optional(),
    /** When `"1"`, product may use on-device / VPC SLM for intake assist (`src/lib/ai/localIntakeSlm.ts`). */
    NEXT_PUBLIC_LOCAL_INTAKE_SLM: z.enum(["0", "1"]).optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_USE_PG: process.env.DATABASE_USE_PG,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL:
      process.env.BETTER_AUTH_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      vercelDeploymentOrigin(),
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
    OIDC_JIT_ENABLED: process.env.OIDC_JIT_ENABLED,
    OIDC_JIT_DEFAULT_ORG_ID: process.env.OIDC_JIT_DEFAULT_ORG_ID,
    OIDC_JIT_ROLE_SLUG: process.env.OIDC_JIT_ROLE_SLUG,
    INTEGRATION_INBOUND_SECRET: process.env.INTEGRATION_INBOUND_SECRET,
    CRON_FAILURE_WEBHOOK_URL: process.env.CRON_FAILURE_WEBHOOK_URL,
    JOB_QUEUE_ENABLED: process.env.JOB_QUEUE_ENABLED,
    PG_BOSS_ENABLED: process.env.PG_BOSS_ENABLED,
    PG_BOSS_SCHEMA: process.env.PG_BOSS_SCHEMA,
    CONTEXT_SYNC_ORG_DAILY_READ_LIMIT: process.env.CONTEXT_SYNC_ORG_DAILY_READ_LIMIT,
    CONTEXT_SYNC_PROVENANCE_MAX_LIMIT: process.env.CONTEXT_SYNC_PROVENANCE_MAX_LIMIT,
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ?? vercelDeploymentOrigin(),
    NEXT_PUBLIC_ENTERPRISE_SSO: process.env.NEXT_PUBLIC_ENTERPRISE_SSO,
    NEXT_PUBLIC_OIDC_PROVIDER_ID: process.env.NEXT_PUBLIC_OIDC_PROVIDER_ID,
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
    NEXT_PUBLIC_FIELD_OUTBOX: process.env.NEXT_PUBLIC_FIELD_OUTBOX,
    NEXT_PUBLIC_LOCAL_INTAKE_SLM: process.env.NEXT_PUBLIC_LOCAL_INTAKE_SLM,
  },
  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION || isNextProductionBuild,
});
