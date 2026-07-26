"use client";

import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useState } from "react";
import superjson from "superjson";
import type { AppRouter } from "@/server/trpc/root";
import { makeQueryClient } from "./query-client";

/** Classic hooks (`trpc.*.useQuery`) — existing dashboard surfaces. */
export const trpc = createTRPCReact<AppRouter>();

/** TanStack Query options API (`useTRPC` + `queryOptions`) — RSC pilot pages. */
export const { TRPCProvider: TanstackTRPCProvider, useTRPC } =
  createTRPCContext<AppRouter>();

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

function createLinks() {
  return [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    }),
  ];
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [classicClient] = useState(() =>
    trpc.createClient({
      links: createLinks(),
    }),
  );
  const [tanstackClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: createLinks(),
    }),
  );

  return (
    <trpc.Provider client={classicClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <TanstackTRPCProvider
          trpcClient={tanstackClient}
          queryClient={queryClient}
        >
          {children}
        </TanstackTRPCProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
