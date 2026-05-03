import "server-only";

import { headers } from "next/headers";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/root";

export const serverApi = appRouter.createCaller(async () => {
  const h = await headers();
  return createTRPCContext({ headers: h });
});
