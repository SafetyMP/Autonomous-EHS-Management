import { getClientIpFromHeaders } from "@/lib/request-ip";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

export async function createTRPCContext(opts: { headers: Headers }) {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });
  const ip = getClientIpFromHeaders(opts.headers);

  return {
    session,
    db,
    ip,
  } as const;
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
