import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { parseCtxUri } from "@/server/services/contextSync/parseCtxUri";
import {
  contextSoftDeleteArtifact,
  contextSyncCreateArtifact,
  contextSyncReadArtifact,
  contextSyncUpdateArtifact,
} from "@/server/services/contextSync/artifacts";
import {
  ctxErrResponse,
  demoWriteBlockedResponse,
  gateContextSyncOrgDailyReadQuota,
  gateContextSyncRateLimit,
  resolveContextActor,
} from "../_lib/http";
import { gateContextSyncOrgEnabled } from "@/server/services/contextSync/orgCapability";

export async function GET(request: NextRequest) {
  try {
    const actorRes = await resolveContextActor(request);
    if (!actorRes.ok) return actorRes.response;

    const rl = await gateContextSyncRateLimit(request, actorRes.userId, "artifacts");
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
    const quotaGet = await gateContextSyncOrgDailyReadQuota(parsed.orgId);
    if (quotaGet) return quotaGet;

    const versionRaw = request.nextUrl.searchParams.get("version");
    let version: number | null = null;
    if (versionRaw !== null && versionRaw !== "") {
      const parsedV = Number.parseInt(versionRaw, 10);
      if (!Number.isFinite(parsedV) || parsedV < 1) {
        return NextResponse.json(
          { error: "bad_request", message: "Invalid version" },
          { status: 400 },
        );
      }
      version = parsedV;
    }

    const out = await contextSyncReadArtifact(db, {
      ...parsed,
      userId: actorRes.userId,
      actor: actorRes.actor,
      op: "read",
      version,
    });

    const body: Record<string, unknown> = {
      artifact: {
        uri: out.artifact.uri,
        name: out.artifact.name,
        org: out.artifact.organizationId,
        domain: out.artifact.domainSegment,
        content_type: out.artifact.contentType,
        head_version: out.artifact.headVersion,
        created_at: out.artifact.createdAt.toISOString(),
        updated_at: out.artifact.updatedAt.toISOString(),
        deleted_at: out.artifact.deletedAt?.toISOString() ?? null,
      },
      content: out.versionRow.content,
      version: out.version,
    };
    if (out.imsMeta) {
      body.ims_linked = true;
      body.ims = out.imsMeta;
      if ("contentSha256" in out.versionRow && typeof out.versionRow.contentSha256 === "string") {
        body.snapshot_sha256 = out.versionRow.contentSha256;
      }
    }

    return NextResponse.json(body);
  } catch (e: unknown) {
    return ctxErrResponse(e);
  }
}

export async function POST(request: NextRequest) {
  const blocked = await demoWriteBlockedResponse();
  if (blocked) return blocked;

  try {
    const actorRes = await resolveContextActor(request);
    if (!actorRes.ok) return actorRes.response;

    const rl = await gateContextSyncRateLimit(request, actorRes.userId, "artifacts");
    if (rl) return rl;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "bad_request", message: "Invalid JSON" }, { status: 400 });
    }

    const uri = typeof body.uri === "string" ? body.uri : null;
    const name = typeof body.name === "string" ? body.name : null;
    const content =
      typeof body.content === "string" ? body.content : "";
    const contentType =
      typeof body.content_type === "string" ? body.content_type : "text/plain";
    const summary =
      typeof body.summary === "string" ? body.summary : "";

    if (!uri || !name || !content.trim()) {
      return NextResponse.json(
        {
          error: "bad_request",
          message: "uri, name, and non-empty content are required",
        },
        { status: 400 },
      );
    }

    const parsed = parseCtxUri(uri);
    if (!parsed) {
      return NextResponse.json(
        { error: "bad_request", message: "Invalid ContextSync URI" },
        { status: 400 },
      );
    }

    const capPost = await gateContextSyncOrgEnabled(db, parsed.orgId);
    if (capPost) return capPost;
    const quotaPost = await gateContextSyncOrgDailyReadQuota(parsed.orgId);
    if (quotaPost) return quotaPost;

    const { artifact, version } = await contextSyncCreateArtifact(db, {
      ...parsed,
      userId: actorRes.userId,
      actor: actorRes.actor,
      op: "write",
      name,
      contentType,
      content,
      summary,
      authorActorId: actorRes.actor.actorId,
    });

    return NextResponse.json(
      {
        artifact: {
          uri: artifact.uri,
          name: artifact.name,
          org: artifact.organizationId,
          domain: artifact.domainSegment,
          content_type: artifact.contentType,
          head_version: artifact.headVersion,
          created_at: artifact.createdAt.toISOString(),
          updated_at: artifact.updatedAt.toISOString(),
        },
        version,
      },
      { status: 201 },
    );
  } catch (e: unknown) {
    return ctxErrResponse(e);
  }
}

export async function PUT(request: NextRequest) {
  const blocked = await demoWriteBlockedResponse();
  if (blocked) return blocked;

  try {
    const actorRes = await resolveContextActor(request);
    if (!actorRes.ok) return actorRes.response;

    const rl = await gateContextSyncRateLimit(request, actorRes.userId, "artifacts");
    if (rl) return rl;

    const uri = request.nextUrl.searchParams.get("uri");
    if (!uri) {
      return NextResponse.json({ error: "bad_request", message: "uri is required" }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "bad_request", message: "Invalid JSON" }, { status: 400 });
    }

    const content = typeof body.content === "string" ? body.content : "";
    const summary = typeof body.summary === "string" ? body.summary : "";

    if (!content.trim()) {
      return NextResponse.json(
        { error: "bad_request", message: "content is required" },
        { status: 400 },
      );
    }

    const parsed = parseCtxUri(uri);
    if (!parsed) {
      return NextResponse.json(
        { error: "bad_request", message: "Invalid ContextSync URI" },
        { status: 400 },
      );
    }

    const capPut = await gateContextSyncOrgEnabled(db, parsed.orgId);
    if (capPut) return capPut;
    const quotaPut = await gateContextSyncOrgDailyReadQuota(parsed.orgId);
    if (quotaPut) return quotaPut;

    const upd = await contextSyncUpdateArtifact(db, {
      ...parsed,
      userId: actorRes.userId,
      actor: actorRes.actor,
      op: "write",
      content,
      summary,
      authorActorId: actorRes.actor.actorId,
    });

    return NextResponse.json({ version: upd.version });
  } catch (e: unknown) {
    return ctxErrResponse(e);
  }
}

export async function DELETE(request: NextRequest) {
  const blocked = await demoWriteBlockedResponse();
  if (blocked) return blocked;

  try {
    const actorRes = await resolveContextActor(request);
    if (!actorRes.ok) return actorRes.response;

    const rl = await gateContextSyncRateLimit(request, actorRes.userId, "artifacts");
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

    const capDel = await gateContextSyncOrgEnabled(db, parsed.orgId);
    if (capDel) return capDel;
    const quotaDel = await gateContextSyncOrgDailyReadQuota(parsed.orgId);
    if (quotaDel) return quotaDel;

    await contextSoftDeleteArtifact(db, {
      ...parsed,
      userId: actorRes.userId,
      actor: actorRes.actor,
      op: "write",
    });

    return new Response(null, { status: 204 });
  } catch (e: unknown) {
    return ctxErrResponse(e);
  }
}
