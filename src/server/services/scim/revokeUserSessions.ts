import { eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { authSession } from "@/server/db/schema";

/** Revoke all Better Auth sessions for a user (SCIM deprovision / deactivate). */
export async function revokeUserSessions(db: Pick<Db, "delete">, userId: string): Promise<number> {
  const deleted = await db.delete(authSession).where(eq(authSession.userId, userId)).returning({ id: authSession.id });
  return deleted.length;
}
