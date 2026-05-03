import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import {
  contextSyncListActors,
  contextSyncRegisterActor,
} from "@/server/services/contextSync/artifacts";
import { gateContextSyncOrgEnabled } from "@/server/services/contextSync/orgCapability";
import {
  ctxErrResponse,
  demoWriteBlockedResponse,
  gateContextSyncOrgDailyReadQuota,
  gateContextSyncRateLimit,
  resolveContextActor,
} from "../_lib/http";

const postBody = z
  .object({
    organization_id: z.string().uuid(),
    actor_id: z.string().min(1).max(256),
    actor_type: z.enum(["human", "agent"]),
    name: z.string().min(1).max(512),
    agent_class: z.string().min(1).max(128).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.actor_type === "agent" && !(val.agent_class && val.agent_class.trim())) {
      ctx.addIssue({
        code: "custom",
        message: "agent_class is required when actor_type is agent",
      });
    }
  });

export async function GET(request: NextRequest) {
  try {
    const actorRes = await resolveContextActor(request);
    if (!actorRes.ok) return actorRes.response;

    const rl = await gateContextSyncRateLimit(request, actorRes.userId, "actors");
    if (rl) return rl;

    const org = request.nextUrl.searchParams.get("organization_id");
    if (!org) {
      return NextResponse.json(
        { error: "bad_request", message: "organization_id is required" },
        { status: 400 },
      );
    }

    const capActorsGet = await gateContextSyncOrgEnabled(db, org);
    if (capActorsGet) return capActorsGet;
    const quotaGet = await gateContextSyncOrgDailyReadQuota(org);
    if (quotaGet) return quotaGet;

    const rows = await contextSyncListActors(db, {
      userId: actorRes.userId,
      organizationId: org,
    });

    return NextResponse.json({
      actors: rows.map((a) => ({
        actor_id: a.actorId,
        actor_type: a.actorType,
        name: a.name,
        agent_class: a.agentClass,
      })),
    });
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

    const rl = await gateContextSyncRateLimit(request, actorRes.userId, "actors");
    if (rl) return rl;

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "bad_request", message: "Invalid JSON" }, { status: 400 });
    }

    const parsed = postBody.safeParse(json);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ");
      return NextResponse.json({ error: "bad_request", message: msg }, { status: 400 });
    }

    const capActorsPost = await gateContextSyncOrgEnabled(db, parsed.data.organization_id);
    if (capActorsPost) return capActorsPost;
    const quotaPost = await gateContextSyncOrgDailyReadQuota(parsed.data.organization_id);
    if (quotaPost) return quotaPost;

    const row = await contextSyncRegisterActor(db, {
      userId: actorRes.userId,
      organizationId: parsed.data.organization_id,
      actorId: parsed.data.actor_id,
      actorType: parsed.data.actor_type,
      name: parsed.data.name,
      agentClass: parsed.data.agent_class ?? undefined,
    });

    return NextResponse.json(
      {
        actor_id: row.actorId,
        actor_type: row.actorType,
        name: row.name,
        agent_class: row.agentClass,
      },
      { status: 201 },
    );
  } catch (e: unknown) {
    return ctxErrResponse(e);
  }
}
