import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";
import { readValidatedEnv } from "@/server/read-env";

function createLimiter(): Ratelimit | null {
  const env = readValidatedEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    analytics: true,
    prefix: "ehs:ratelimit",
  });
}

let limiter: Ratelimit | null | undefined;

function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter;
  limiter = createLimiter();
  return limiter;
}

const isProd = process.env.NODE_ENV === "production";

/**
 * Emergency kill switch (env: `RATE_LIMIT_DISABLED=true`) — bypasses the prod fail-closed gate so
 * the app can run before Upstash is provisioned. Logged once so it shows up in audit / boot logs.
 */
let killSwitchLogged = false;
function isRateLimitDisabled(): boolean {
  const disabled = readValidatedEnv().RATE_LIMIT_DISABLED === "true";
  if (disabled && isProd && !killSwitchLogged) {
    killSwitchLogged = true;
    console.warn(
      "[ratelimit] RATE_LIMIT_DISABLED=true in production — auth, tRPC, RAG ingest, and Context Sync REST are not rate-limited. Set UPSTASH_REDIS_REST_URL/TOKEN and unset this flag.",
    );
  }
  return disabled;
}

export function isRateLimiterConfigured(): boolean {
  return getLimiter() !== null;
}

/** Returns false when Upstash is configured and the bucket is exceeded. */
export async function rateLimitAllow(identifier: string): Promise<boolean> {
  const lim = getLimiter();
  if (!lim) {
    if (isProd && !isRateLimitDisabled()) return false;
    return true;
  }
  const { success } = await lim.limit(identifier);
  return success;
}

export async function rateLimitOrThrow(
  identifier: string,
): Promise<void> {
  if (isProd && !isRateLimiterConfigured() && !isRateLimitDisabled()) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Rate limiting is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    });
  }
  const lim = getLimiter();
  if (!lim) {
    return;
  }
  const { success } = await lim.limit(identifier);
  if (!success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded. Try again shortly.",
    });
  }
}

/**
 * JSON response for `/api/contextsync/*` when over limit or prod without Upstash config.
 * Returns null when the request may proceed (dev without Redis: pass-through).
 */
export async function rateLimitContextSyncResponse(
  identifier: string,
): Promise<Response | null> {
  if (isProd && !isRateLimiterConfigured() && !isRateLimitDisabled()) {
    return NextResponse.json(
      {
        error: "internal_error",
        message:
          "Rate limiting is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
      },
      { status: 500 },
    );
  }
  const lim = getLimiter();
  if (!lim) {
    return null;
  }
  const { success } = await lim.limit(identifier);
  if (!success) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Rate limit exceeded. Try again shortly.",
      },
      { status: 429 },
    );
  }
  return null;
}
