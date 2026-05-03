import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { contextSyncGetActor } from "@/server/services/contextSync/artifacts";
import { gateContextSyncOrgEnabled } from "@/server/services/contextSync/orgCapability";
import { ctxErrResponse, gateContextSyncOrgDailyReadQuota, gateContextSyncRateLimit, resolveContextActor } from "../../_lib/http";

type RouteContext = { params: Promise<{ actorId: string }> };

export async function GET(request: NextRequest, routeContext: RouteContext) {
  try {
    const actorRes = await resolveContextActor(request);
    if (!actorRes.ok) return actorRes.response;

    const rl = await gateContextSyncRateLimit(request, actorRes.userId, "actors/by-id");
    if (rl) return rl;

    const organizationId = request.nextUrl.searchParams.get("organization_id");
    if (!organizationId) {
      return NextResponse.json(
        { error: "bad_request", message: "organization_id is required" },
        { status: 400 },
      );
    }

    const capActorOne = await gateContextSyncOrgEnabled(db, organizationId);
    if (capActorOne) return capActorOne;
    const quota = await gateContextSyncOrgDailyReadQuota(organizationId);
    if (quota) return quota;

    const { actorId } = await routeContext.params;
    const raw = decodeURIComponent(actorId);
    const row = await contextSyncGetActor(db, {
      userId: actorRes.userId,
      organizationId,
      actorId: raw,
    });

    return NextResponse.json({
      actor_id: row.actorId,
      actor_type: row.actorType,
      name: row.name,
      agent_class: row.agentClass,
    });
  } catch (e: unknown) {
    return ctxErrResponse(e);
  }
}
