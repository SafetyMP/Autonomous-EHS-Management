import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { contextSyncQueryProvenance } from "@/server/services/contextSync/artifacts";
import { gateContextSyncOrgEnabled } from "@/server/services/contextSync/orgCapability";
import { contextSyncProvenanceMaxEntries } from "@/server/services/contextSync/dailyReadQuota";
import { ctxErrResponse, gateContextSyncOrgDailyReadQuota, gateContextSyncRateLimit, resolveContextActor } from "../_lib/http";

export async function GET(request: NextRequest) {
  try {
    const actorRes = await resolveContextActor(request);
    if (!actorRes.ok) return actorRes.response;

    const rl = await gateContextSyncRateLimit(request, actorRes.userId, "provenance");
    if (rl) return rl;

    const artifact = request.nextUrl.searchParams.get("artifact");
    const actor = request.nextUrl.searchParams.get("actor");
    const organizationId = request.nextUrl.searchParams.get("organization_id");
    const limRaw = request.nextUrl.searchParams.get("limit");

    if (!organizationId) {
      return NextResponse.json(
        { error: "bad_request", message: "organization_id is required" },
        { status: 400 },
      );
    }

    const capProv = await gateContextSyncOrgEnabled(db, organizationId);
    if (capProv) return capProv;
    const quota = await gateContextSyncOrgDailyReadQuota(organizationId);
    if (quota) return quota;

    const maxProv = contextSyncProvenanceMaxEntries();
    const limit =
      limRaw === null
        ? Math.min(50, maxProv)
        : Math.max(1, Math.min(Number.parseInt(limRaw, 10) || 50, maxProv));

    const rows = await contextSyncQueryProvenance(db, {
      userId: actorRes.userId,
      organizationId,
      artifactUri: artifact,
      actorId: actor,
      limit,
    });

    return NextResponse.json({
      provenance: rows.map((r) => ({
        prov_id: r.id,
        actor_id: r.actorId,
        operation: r.operation,
        artifact_uri: r.artifactUri,
        version_touched: r.versionTouched,
        downstream_uri: r.downstreamUri,
        created_at: r.createdAt.toISOString(),
      })),
    });
  } catch (e: unknown) {
    return ctxErrResponse(e);
  }
}
