import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { parseCtxUri } from "@/server/services/contextSync/parseCtxUri";
import { contextSyncArtifactDiff } from "@/server/services/contextSync/artifacts";
import { gateContextSyncOrgEnabled } from "@/server/services/contextSync/orgCapability";
import { ctxErrResponse, gateContextSyncOrgDailyReadQuota, gateContextSyncRateLimit, resolveContextActor } from "../../_lib/http";

export async function GET(request: NextRequest) {
  try {
    const actorRes = await resolveContextActor(request);
    if (!actorRes.ok) return actorRes.response;

    const rl = await gateContextSyncRateLimit(request, actorRes.userId, "artifacts/diff");
    if (rl) return rl;

    const uri = request.nextUrl.searchParams.get("uri");
    const fromRaw = request.nextUrl.searchParams.get("from");
    const toRaw = request.nextUrl.searchParams.get("to");
    if (!uri || fromRaw === null || toRaw === null) {
      return NextResponse.json(
        {
          error: "bad_request",
          message: "uri, from, and to query parameters are required",
        },
        { status: 400 },
      );
    }

    const fromVer = Number.parseInt(fromRaw, 10);
    const toVer = Number.parseInt(toRaw, 10);
    if (!Number.isFinite(fromVer) || !Number.isFinite(toVer) || fromVer < 1 || toVer < 1) {
      return NextResponse.json({ error: "bad_request", message: "Invalid version bounds" }, { status: 400 });
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

    const diff = await contextSyncArtifactDiff(db, {
      ...parsed,
      userId: actorRes.userId,
      actor: actorRes.actor,
      op: "read",
      from: fromVer,
      to: toVer,
    });

    return NextResponse.json({
      artifact_uri: diff.artifactUri,
      from: diff.from,
      to: diff.to,
      diff_json: {
        stats: {
          added_lines: diff.stats.addedLines,
          removed_lines: diff.stats.removedLines,
          unchanged_lines: diff.stats.unchangedLines,
        },
        hunks: diff.hunks,
      },
    });
  } catch (e: unknown) {
    return ctxErrResponse(e);
  }
}
