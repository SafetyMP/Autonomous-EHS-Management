import { and, eq, ne, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { membership } from "@/server/db/schema";

/** True when the user has any membership outside the given organization. */
export async function userHasMembershipOutsideOrg(
  db: Pick<Db, "select">,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(membership)
    .where(and(eq(membership.userId, userId), ne(membership.organizationId, organizationId)))
    .limit(1);
  return (row?.n ?? 0) > 0;
}
