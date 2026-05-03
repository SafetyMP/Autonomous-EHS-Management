import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";
import { getClientIpFromHeaders } from "@/lib/request-ip";
import {
  isRateLimiterConfigured,
  rateLimitAllow,
} from "@/server/ratelimit";

const { GET: baseGet, POST: basePost } = toNextJsHandler(auth);

export async function GET(req: NextRequest) {
  return baseGet(req);
}

export async function POST(req: NextRequest) {
  const ip = getClientIpFromHeaders(req.headers);

  if (process.env.NODE_ENV === "production" && !isRateLimiterConfigured()) {
    return NextResponse.json(
      {
        error:
          "Service temporarily unavailable (rate limit backend not configured).",
      },
      { status: 503 },
    );
  }

  const allowed = await rateLimitAllow(`auth:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429 },
    );
  }
  return basePost(req);
}
