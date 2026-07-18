import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { parseCtxUri } from "@/server/services/contextSync/parseCtxUri";
import { parseImsLinkedUri } from "@/server/services/contextSync/imsLinkedUri";
import { gateContextSyncOrgEnabled } from "@/server/services/contextSync/orgCapability";
import {
  assertOrgMembership,
  explainContextSyncAccess,
} from "@/server/services/contextSync/authorize";
import { ctxErrResponse, gateContextSyncOrgDailyReadQuota, gateContextSyncRateLimit, resolveContextActor } from "../../_lib/http";

const opSchema = new Set(["read", "write", "suggest", "approve", "admin"]);

export async function GET(request: NextRequest) {
  try {
    const actorRes = await resolveContextActor(request);
    if (!actorRes.ok) return actorRes.response;

    const rl = await gateContextSyncRateLimit(request, actorRes.userId, "permissions/explain");
    if (rl) return rl;

    const actorId = actorRes.actor.actorId;
    const uri = request.nextUrl.searchParams.get("uri");
    const opRaw = request.nextUrl.searchParams.get("op");
    const orgRaw = request.nextUrl.searchParams.get("organization_id");

    if (!uri || !opRaw || !orgRaw) {
      return NextResponse.json(
        {
          error: "bad_request",
          message: "organization_id, uri, and op query parameters are required",
        },
        { status: 400 },
      );
    }

    if (!opSchema.has(opRaw)) {
      return NextResponse.json({ error: "bad_request", message: "Invalid op" }, { status: 400 });
    }

    const parsed = parseCtxUri(uri);
    if (!parsed) {
      return NextResponse.json(
        { error: "bad_request", message: "Invalid ContextSync URI" },
        { status: 400 },
      );
    }

    if (parsed.orgId !== orgRaw) {
      return NextResponse.json(
        {
          error: "bad_request",
          message: "organization_id must match URI org segment",
        },
        { status: 400 },
      );
    }

    const capEx = await gateContextSyncOrgEnabled(db, orgRaw);
    if (capEx) return capEx;

    if (!(await assertOrgMembership(db, actorRes.userId, orgRaw))) {
      return NextResponse.json(
        { error: "forbidden", reason: "not_org_member" },
        { status: 403 },
      );
    }

    const quota = await gateContextSyncOrgDailyReadQuota(orgRaw);
    if (quota) return quota;

    const explain = await explainContextSyncAccess({
      db,
      userId: actorRes.userId,
      organizationId: orgRaw,
      artifactUri: uri,
      actor: { actorId, agentClass: actorRes.actor.agentClass },
      operation: opRaw as "read" | "write" | "suggest" | "approve" | "admin",
      imsLinkedReadKind: parseImsLinkedUri(parsed)?.kind ?? null,
    });

    return NextResponse.json({
      allowed: explain.allowed,
      reason: explain.reason,
      matched_grant_id: explain.matched_grant_id,
    });
  } catch (e: unknown) {
    return ctxErrResponse(e);
  }
}
