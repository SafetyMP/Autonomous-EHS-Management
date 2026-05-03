import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { contextSyncCreateGrant } from "@/server/services/contextSync/artifacts";
import { gateContextSyncOrgEnabled } from "@/server/services/contextSync/orgCapability";
import {
  ctxErrResponse,
  demoWriteBlockedResponse,
  gateContextSyncOrgDailyReadQuota,
  gateContextSyncRateLimit,
  resolveContextActor,
} from "../_lib/http";

const bodySchema = z
  .object({
    organization_id: z.string().uuid(),
    artifact_pattern: z.string().min(1).max(2048),
    operations: z.array(z.string().min(1)).min(1),
    actor_id: z.string().min(1).max(256).optional().nullable(),
    agent_class: z.string().min(1).max(128).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    const hasActor = Boolean(val.actor_id);
    const hasClass = Boolean(val.agent_class);
    if (hasActor === hasClass) {
      ctx.addIssue({
        code: "custom",
        message: "Exactly one of actor_id or agent_class is required",
      });
    }
  });

export async function POST(request: NextRequest) {
  const blocked = await demoWriteBlockedResponse();
  if (blocked) return blocked;

  try {
    const actorRes = await resolveContextActor(request);
    if (!actorRes.ok) return actorRes.response;

    const rl = await gateContextSyncRateLimit(request, actorRes.userId, "permissions/grants");
    if (rl) return rl;

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "bad_request", message: "Invalid JSON" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ");
      return NextResponse.json({ error: "bad_request", message: msg }, { status: 400 });
    }

    const capGrant = await gateContextSyncOrgEnabled(db, parsed.data.organization_id);
    if (capGrant) return capGrant;
    const quota = await gateContextSyncOrgDailyReadQuota(parsed.data.organization_id);
    if (quota) return quota;

    const grant = await contextSyncCreateGrant(db, {
      userId: actorRes.userId,
      organizationId: parsed.data.organization_id,
      actorId: parsed.data.actor_id ?? undefined,
      agentClass: parsed.data.agent_class ?? undefined,
      artifactPattern: parsed.data.artifact_pattern,
      operations: parsed.data.operations,
    });

    return NextResponse.json(
      {
        id: grant.id,
        organization_id: grant.organizationId,
        actor_id: grant.actorId,
        agent_class: grant.agentClass,
        artifact_pattern: grant.artifactPattern,
        operations: grant.operations,
      },
      { status: 201 },
    );
  } catch (e: unknown) {
    return ctxErrResponse(e);
  }
}
