import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIpFromHeaders } from "@/lib/request-ip";

/**
 * Avoid evaluating Better Auth + `createEnv` at module load. During `next build`, workers
 * can import this file with an incomplete `process.env`; lazy `import()` defers validation
 * until a real request (or until handlers run).
 */
export const dynamic = "force-dynamic";

type AuthRouteHandlers = {
  GET: (request: NextRequest) => Promise<Response>;
  POST: (request: NextRequest) => Promise<Response>;
};

let handlersPromise: Promise<AuthRouteHandlers> | null = null;

async function loadAuthHandlers(): Promise<AuthRouteHandlers> {
  const [{ toNextJsHandler }, { auth }] = await Promise.all([
    import("better-auth/next-js"),
    import("@/server/auth"),
  ]);
  const h = toNextJsHandler(auth);
  return {
    GET: (req) => h.GET(req),
    POST: (req) => h.POST(req),
  };
}

function authHandlers(): Promise<AuthRouteHandlers> {
  handlersPromise ??= loadAuthHandlers();
  return handlersPromise;
}

export async function GET(req: NextRequest) {
  const { GET: baseGet } = await authHandlers();
  return baseGet(req);
}

export async function POST(req: NextRequest) {
  const [{ POST: basePost }, { isRateLimiterConfigured, rateLimitAllow }] =
    await Promise.all([authHandlers(), import("@/server/ratelimit")]);

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
