import { Suspense } from "react";
import {
  HydrateClient,
  prefetch,
  resolvePrefetchOrganizationId,
  trpc,
} from "@/trpc/server";
import { ObservationsListClient } from "./observations-list-client";

export default async function ObservationsPage() {
  const organizationId = await resolvePrefetchOrganizationId();
  if (organizationId) {
    prefetch(trpc.observation.list.queryOptions({ organizationId }));
  }

  return (
    <HydrateClient>
      <Suspense
        fallback={
          <div role="status" aria-live="polite" className="p-8 text-base text-zinc-600">
            Loading observations…
          </div>
        }
      >
        <ObservationsListClient />
      </Suspense>
    </HydrateClient>
  );
}
