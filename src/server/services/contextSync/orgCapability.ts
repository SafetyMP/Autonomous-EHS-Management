import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { Db } from "@/server/db";
import { organization } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

/** JSON body shape when Context Sync is disabled for the tenant (REST). */
export function contextSyncDisabledRestResponse(): Response {
  return NextResponse.json(
    {
      error: "forbidden",
      reason: "context_sync_disabled",
      message:
        "Context Sync is not enabled for this organization. An organization admin can enable it in settings.",
    },
    { status: 403 },
  );
}

/**
 * Returns a 403 Response when the org has Context Sync off; null when enabled or org missing.
 * Call after resolving the actor and (when possible) validating org UUID format.
 */
export async function gateContextSyncOrgEnabled(
  db: Db,
  organizationId: string,
): Promise<Response | null> {
  const rows = await db
    .select({ enabled: organization.contextSyncEnabled })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "bad_request", message: "Unknown organization" },
      { status: 400 },
    );
  }

  if (!rows[0].enabled) {
    return contextSyncDisabledRestResponse();
  }

  return null;
}

export async function assertContextSyncEnabledForTrpc(db: Db, organizationId: string): Promise<void> {
  const rows = await db
    .select({ enabled: organization.contextSyncEnabled })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (rows.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown organization." });
  }

  if (!rows[0].enabled) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Context Sync is not enabled for this organization. An organization admin can enable it in settings.",
    });
  }
}
