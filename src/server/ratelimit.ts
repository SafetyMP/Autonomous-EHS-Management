import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

function createLimiter() {
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

const limiter = createLimiter();
const isProd = process.env.NODE_ENV === "production";

export function isRateLimiterConfigured(): boolean {
  return limiter !== null;
}

/** Returns false when Upstash is configured and the bucket is exceeded. */
export async function rateLimitAllow(identifier: string): Promise<boolean> {
  if (!limiter) {
    if (isProd) return false;
    return true;
  }
  const { success } = await limiter.limit(identifier);
  return success;
}

export async function rateLimitOrThrow(
  identifier: string,
): Promise<void> {
  if (isProd && !isRateLimiterConfigured()) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Rate limiting is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    });
  }
  if (!limiter) {
    return;
  }
  const { success } = await limiter.limit(identifier);
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
  if (isProd && !isRateLimiterConfigured()) {
    return NextResponse.json(
      {
        error: "internal_error",
        message:
          "Rate limiting is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
      },
      { status: 500 },
    );
  }
  if (!limiter) {
    return null;
  }
  const { success } = await limiter.limit(identifier);
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
