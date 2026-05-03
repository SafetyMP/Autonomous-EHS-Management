import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { isRateLimiterConfigured } from "@/server/ratelimit";

function redisClient(): Redis | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Configured limit; 0 means quota is off. */
export function contextSyncOrgDailyReadLimit(): number {
  const raw = env.CONTEXT_SYNC_ORG_DAILY_READ_LIMIT;
  if (raw === undefined || raw === null) return 0;
  return raw;
}

/**
 * Rolling counter per org per UTC day. When over limit, rolls back the increment and returns 429.
 * Requires Upstash in production when limit is set (matches Context Sync rate-limit posture).
 */
export async function gateContextSyncOrgDailyReadQuota(
  organizationId: string,
): Promise<Response | null> {
  const limit = contextSyncOrgDailyReadLimit();
  if (limit <= 0) {
    return null;
  }

  const isProd = process.env.NODE_ENV === "production";
  if (isProd && !isRateLimiterConfigured()) {
    return NextResponse.json(
      {
        error: "internal_error",
        reason: "quota_redis_unconfigured",
        message:
          "Context Sync daily quota requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
      },
      { status: 500 },
    );
  }

  const redis = redisClient();
  if (!redis) {
    return null;
  }

  const key = `ehs:ctxsync:reads:${organizationId}:${utcDayKey(new Date())}`;
  const n = await redis.incr(key);
  if (n === 1) {
    await redis.expire(key, 172800);
  }
  if (n > limit) {
    await redis.decr(key);
    return NextResponse.json(
      {
        error: "quota_exceeded",
        reason: "context_sync_org_daily_read_quota",
        limit,
        message:
          "Organization Context Sync read quota for the UTC day is exhausted. Try tomorrow or raise CONTEXT_SYNC_ORG_DAILY_READ_LIMIT.",
      },
      { status: 429 },
    );
  }

  return null;
}

/** Upper bound for provenance `limit` query param (default 200). */
export function contextSyncProvenanceMaxEntries(): number {
  return env.CONTEXT_SYNC_PROVENANCE_MAX_LIMIT ?? 200;
}
