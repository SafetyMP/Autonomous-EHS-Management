import { and, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { integrationInboundIdempotency } from "@/server/db/schema";

/** Returns cached webhook response bodies for LMS/HRIS replays (`idempotencyKey` per org). */
export async function lookupIntegrationInboundCache(
  db: Pick<Db, "select">,
  organizationId: string,
  inboundKey: string,
): Promise<{ httpStatus: number; responseJson: Record<string, unknown> } | null> {
  const [row] = await db
    .select({
      httpStatus: integrationInboundIdempotency.httpStatus,
      responseJson: integrationInboundIdempotency.responseJson,
    })
    .from(integrationInboundIdempotency)
    .where(
      and(
        eq(integrationInboundIdempotency.organizationId, organizationId),
        eq(integrationInboundIdempotency.inboundKey, inboundKey),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function storeIntegrationInboundCache(
  db: Pick<Db, "insert">,
  organizationId: string,
  inboundKey: string,
  httpStatus: number,
  responseJson: Record<string, unknown>,
): Promise<void> {
  await db
    .insert(integrationInboundIdempotency)
    .values({
      organizationId,
      inboundKey,
      httpStatus,
      responseJson,
    })
    .onConflictDoNothing({
      target: [
        integrationInboundIdempotency.organizationId,
        integrationInboundIdempotency.inboundKey,
      ],
    });
}
