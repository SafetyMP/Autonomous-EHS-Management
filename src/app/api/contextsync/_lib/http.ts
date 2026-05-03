import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClientIpFromHeaders } from "@/lib/request-ip";
import { auth } from "@/server/auth";
import { env } from "@/lib/env";
import { rateLimitContextSyncResponse } from "@/server/ratelimit";
import type { ContextActor } from "@/server/services/contextSync/authorize";
import { ContextSyncError } from "@/server/services/contextSync/errors";

export { gateContextSyncOrgDailyReadQuota } from "@/server/services/contextSync/dailyReadQuota";

/** Sliding-window parity with tRPC middleware (`${ip}:${path}`); routeKey distinguishes handlers. */
export async function gateContextSyncRateLimit(
  req: NextRequest,
  userId: string,
  routeKey: string,
): Promise<Response | null> {
  const ip = getClientIpFromHeaders(req.headers);
  return rateLimitContextSyncResponse(`${ip}:${userId}:ctxsync:${routeKey}`);
}

export function demoWriteBlockedResponse(): Response | null {
  if (env.DEMO_MODE === "true" && env.DEMO_READ_ONLY === "true") {
    return NextResponse.json(
      { error: "forbidden", reason: "demo_read_only" },
      { status: 403 },
    );
  }
  return null;
}

/** Protocol identity is anchored to Better Auth (`human:{session.user.id}`). */
export async function resolveContextActor(req: NextRequest): Promise<
  | { ok: true; userId: string; actor: ContextActor }
  | { ok: false; response: Response }
> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "actor_required",
          reason: "sign_in_required",
          message: "Sign in required for ContextSync API.",
        },
        { status: 401 },
      ),
    };
  }

  const actorHeader =
    req.headers.get("x-actor-id") ?? req.nextUrl.searchParams.get("actor_id") ?? "";

  const expectedHuman = `human:${session.user.id}`;
  const trimmed = actorHeader.trim();

  if (trimmed !== expectedHuman) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "forbidden",
          reason: "actor_mismatch",
          message: `X-Actor-Id must be '${expectedHuman}' (Better Auth-bound identity).`,
        },
        { status: 403 },
      ),
    };
  }

  const ac = req.headers.get("x-agent-class");
  return {
    ok: true,
    userId: session.user.id,
    actor: {
      actorId: trimmed,
      agentClass: ac && ac.trim().length > 0 ? ac.trim() : null,
    },
  };
}

export function ctxErrResponse(e: unknown): Response {
  if (e instanceof ContextSyncError) {
    return NextResponse.json(e.body, { status: e.status });
  }
  throw e;
}
