import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { contextSyncListArtifacts } from "@/server/services/contextSync/artifacts";
import { gateContextSyncOrgEnabled } from "@/server/services/contextSync/orgCapability";
import { ctxErrResponse, gateContextSyncOrgDailyReadQuota, gateContextSyncRateLimit, resolveContextActor } from "../../_lib/http";

export async function GET(request: NextRequest) {
  try {
    const actorRes = await resolveContextActor(request);
    if (!actorRes.ok) return actorRes.response;

    const rl = await gateContextSyncRateLimit(request, actorRes.userId, "artifacts/list");
    if (rl) return rl;

    const org = request.nextUrl.searchParams.get("org");
    if (!org) {
      return NextResponse.json(
        {
          error: "bad_request",
          message:
            "org query parameter is required (organization UUID, matching ctx://{org}/...)",
        },
        { status: 400 },
      );
    }

    const domain = request.nextUrl.searchParams.get("domain");
    const limRaw = request.nextUrl.searchParams.get("limit");
    const limit =
      limRaw === null ? 100 : Math.max(1, Math.min(Number.parseInt(limRaw, 10) || 50, 500));

    const cap = await gateContextSyncOrgEnabled(db, org);
    if (cap) return cap;
    const quota = await gateContextSyncOrgDailyReadQuota(org);
    if (quota) return quota;

    const rows = await contextSyncListArtifacts(db, {
      userId: actorRes.userId,
      actor: actorRes.actor,
      organizationId: org,
      domain: domain ?? undefined,
      limit,
    });

    return NextResponse.json({
      artifacts: rows.map((a) => ({
        uri: a.uri,
        name: a.name,
        domain: a.domainSegment,
        head_version: a.headVersion,
        created_at: a.createdAt.toISOString(),
        updated_at: a.updatedAt.toISOString(),
      })),
    });
  } catch (e: unknown) {
    return ctxErrResponse(e);
  }
}
