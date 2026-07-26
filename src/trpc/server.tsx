import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { cache } from "react";
import { headers } from "next/headers";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/root";
import { makeQueryClient } from "./query-client";

/** Stable per-request QueryClient for RSC prefetch + hydration. */
export const getQueryClient = cache(makeQueryClient);

const createContext = cache(async () => {
  const h = await headers();
  return createTRPCContext({ headers: h });
});

export const trpc = createTRPCOptionsProxy({
  ctx: createContext,
  router: appRouter,
  queryClient: getQueryClient,
});

/** Direct server caller (detached from the query cache). */
export const serverApi = appRouter.createCaller(createContext);

export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}

type PrefetchQueryOptions = {
  queryKey: readonly unknown[];
  queryFn?: (...args: never[]) => unknown;
};

export function prefetch(queryOptions: PrefetchQueryOptions) {
  const queryClient = getQueryClient();
  const meta = queryOptions.queryKey[1] as { type?: string } | undefined;
  if (meta?.type === "infinite") {
    void queryClient.prefetchInfiniteQuery(queryOptions as never);
  } else {
    void queryClient.prefetchQuery(queryOptions as never);
  }
}

/**
 * When the user belongs to exactly one org, return its id for RSC prefetch.
 * Multi-org users select via OrgSwitcher (client); prefetch is skipped.
 */
export async function resolvePrefetchOrganizationId(): Promise<string | null> {
  const orgs = await serverApi.organization.mine();
  return orgs.length === 1 ? orgs[0]!.id : null;
}
