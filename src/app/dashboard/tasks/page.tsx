import { Suspense } from "react";
import {
  HydrateClient,
  prefetch,
  resolvePrefetchOrganizationId,
  trpc,
} from "@/trpc/server";
import { TasksListClient } from "./tasks-list-client";

export default async function TasksPage() {
  const organizationId = await resolvePrefetchOrganizationId();
  if (organizationId) {
    prefetch(
      trpc.tasks.actionQueue.queryOptions({
        organizationId,
        limit: 50,
        includeOrgWide: true,
      }),
    );
  }

  return (
    <HydrateClient>
      <Suspense
        fallback={
          <div role="status" aria-live="polite" className="p-8 text-base text-zinc-600">
            Loading tasks…
          </div>
        }
      >
        <TasksListClient />
      </Suspense>
    </HydrateClient>
  );
}
