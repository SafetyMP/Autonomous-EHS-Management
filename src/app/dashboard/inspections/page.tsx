import { Suspense } from "react";
import {
  HydrateClient,
  prefetch,
  resolvePrefetchOrganizationId,
  trpc,
} from "@/trpc/server";
import { InspectionsListClient } from "./inspections-list-client";

export default async function InspectionsPage() {
  const organizationId = await resolvePrefetchOrganizationId();
  if (organizationId) {
    prefetch(trpc.inspection.list.queryOptions({ organizationId }));
  }

  return (
    <HydrateClient>
      <Suspense
        fallback={
          <div role="status" aria-live="polite" className="p-8 text-base text-zinc-600">
            Loading inspections…
          </div>
        }
      >
        <InspectionsListClient />
      </Suspense>
    </HydrateClient>
  );
}
