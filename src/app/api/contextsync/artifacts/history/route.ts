import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { parseCtxUri } from "@/server/services/contextSync/parseCtxUri";
import { contextSyncArtifactHistory } from "@/server/services/contextSync/artifacts";
import { gateContextSyncOrgEnabled } from "@/server/services/contextSync/orgCapability";
import { ctxErrResponse, gateContextSyncOrgDailyReadQuota, gateContextSyncRateLimit, resolveContextActor } from "../../_lib/http";

export async function GET(request: NextRequest) {
  try {
    const actorRes = await resolveContextActor(request);
    if (!actorRes.ok) return actorRes.response;

    const rl = await gateContextSyncRateLimit(request, actorRes.userId, "artifacts/history");
    if (rl) return rl;

    const uri = request.nextUrl.searchParams.get("uri");
    if (!uri) {
      return NextResponse.json({ error: "bad_request", message: "uri is required" }, { status: 400 });
    }

    const parsed = parseCtxUri(uri);
    if (!parsed) {
      return NextResponse.json(
        { error: "bad_request", message: "Invalid ContextSync URI" },
        { status: 400 },
      );
    }

    const cap = await gateContextSyncOrgEnabled(db, parsed.orgId);
    if (cap) return cap;
    const quota = await gateContextSyncOrgDailyReadQuota(parsed.orgId);
    if (quota) return quota;

    const hist = await contextSyncArtifactHistory(db, {
      ...parsed,
      userId: actorRes.userId,
      actor: actorRes.actor,
      op: "read",
    });

    if (hist.source === "ims_policy") {
      return NextResponse.json({
        uri: hist.uri,
        source: "ims_policy_revision",
        versions: hist.versions.map((v) => ({
          policy_revision_id: v.id,
          version_label: v.version_label,
          version_stamp: v.version_stamp,
          summary: v.summary,
          status: v.status,
          created_at: v.created_at,
        })),
      });
    }

    return NextResponse.json({
      uri: hist.artifact.uri,
      versions: hist.versions.map((v) => ({
        version: v.version,
        author_id: v.authorActorId,
        summary: v.summary ?? null,
        content_sha256: v.contentSha256,
        created_at: v.createdAt.toISOString(),
      })),
    });
  } catch (e: unknown) {
    return ctxErrResponse(e);
  }
}
