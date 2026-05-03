import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { env } from "@/lib/env";
import { rateLimitOrThrow } from "@/server/ratelimit";
import type { TRPCContext } from "./context";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const middleware = t.middleware;

const enforceUser = middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user,
    },
  });
});

const rateLimited = middleware(async ({ ctx, path, next }) => {
  await rateLimitOrThrow(`${ctx.ip}:${path}`);
  return next();
});

/** Blocks mutations when DEMO_MODE and DEMO_READ_ONLY are both true (browse-only sandbox). */
const demoReadOnly = middleware(({ next }) => {
  if (env.DEMO_MODE === "true" && env.DEMO_READ_ONLY === "true") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Demo is read-only. Unset DEMO_READ_ONLY in your environment to make changes.",
    });
  }
  return next();
});

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(enforceUser);

export const protectedMutation = protectedProcedure
  .use(demoReadOnly)
  .use(rateLimited);
