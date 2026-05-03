import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { mutationIdempotency } from "@/server/db/schema";

type TransactionClient = Parameters<Parameters<Db["transaction"]>[0]>[0];

export function serializeIdempotentResponse<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(row)) as Record<string, unknown>;
}

/**
 * Exactly-once per (org, actor, client key) using a transaction-scoped advisory lock.
 * Replay returns stored JSON (date fields are ISO strings).
 */
export async function runWithMutationIdempotency<T extends Record<string, unknown>>(
  tx: TransactionClient,
  meta: {
    organizationId: string;
    actorUserId: string;
    idempotencyKey?: string | null | undefined;
    procedure: string;
  },
  work: () => Promise<T>,
): Promise<T> {
  const keyIn = meta.idempotencyKey?.trim();
  if (!keyIn) {
    return work();
  }

  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`${meta.organizationId}:${meta.actorUserId}:${keyIn}`}))`,
  );

  const [existing] = await tx
    .select()
    .from(mutationIdempotency)
    .where(
      and(
        eq(mutationIdempotency.organizationId, meta.organizationId),
        eq(mutationIdempotency.actorUserId, meta.actorUserId),
        eq(mutationIdempotency.clientKey, keyIn),
      ),
    )
    .limit(1);

  if (existing) {
    return existing.responseJson as T;
  }

  const result = await work();
  await tx.insert(mutationIdempotency).values({
    organizationId: meta.organizationId,
    actorUserId: meta.actorUserId,
    clientKey: keyIn,
    procedure: meta.procedure,
    responseJson: serializeIdempotentResponse(result),
  });
  return result;
}
