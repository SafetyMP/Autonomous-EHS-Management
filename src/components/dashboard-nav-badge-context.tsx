"use client";

import { createContext, useContext, useMemo } from "react";
import { useOrg } from "@/components/org-context";
import { trpc } from "@/trpc/react";

type NavBadgeCounts = {
  tasksCount: number;
  approvalsCount: number;
};

const DashboardNavBadgeContext = createContext<NavBadgeCounts | null>(null);

export function DashboardNavBadgeProvider({ children }: { children: React.ReactNode }) {
  const { organizationId } = useOrg();
  const { data } = trpc.tasks.actionQueueCounts.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId, staleTime: 30_000 },
  );

  const value = useMemo(
    () => ({
      tasksCount: data?.tasksCount ?? 0,
      approvalsCount: data?.approvalsCount ?? 0,
    }),
    [data],
  );

  return (
    <DashboardNavBadgeContext.Provider value={value}>{children}</DashboardNavBadgeContext.Provider>
  );
}

export function useDashboardNavBadges(): NavBadgeCounts {
  const ctx = useContext(DashboardNavBadgeContext);
  return ctx ?? { tasksCount: 0, approvalsCount: 0 };
}
