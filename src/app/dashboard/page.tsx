"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { CommandCenterDeskView } from "@/components/dashboard/command-center-desk-view";
import { DashboardFieldLauncher } from "@/components/dashboard/dashboard-field-launcher";
import { useOrg } from "@/components/org-context";
import { trpc } from "@/trpc/react";

export default function DashboardHomePage() {
  return (
    <Suspense
      fallback={
        <div role="status" aria-live="polite" className="p-8 text-base text-zinc-600">
          Loading dashboard…
        </div>
      }
    >
      <DashboardHomeContent />
    </Suspense>
  );
}

function DashboardHomeContent() {
  const searchParams = useSearchParams();
  const viewOverride = searchParams.get("view");

  const { organizationId, organizations } = useOrg();
  const utils = trpc.useUtils();

  const orgName = organizations.find((o) => o.id === organizationId)?.name;

  const { data: homeLayout } = trpc.organization.dashboardHomeLayout.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const layoutLoading = viewOverride === "desk" ? false : !homeLayout;

  const effectiveLayout: "desk" | "field" | undefined =
    viewOverride === "desk"
      ? "desk"
      : viewOverride === "field"
        ? "field"
        : homeLayout?.layout;

  const { data: cc, isLoading: ccLoading } = trpc.analytics.commandCenter.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId && effectiveLayout === "desk" },
  );

  const { data: integrationHealth } = trpc.integration.failedEventsHealth.useQuery(
    { organizationId: organizationId! },
    {
      enabled:
        !!organizationId &&
        effectiveLayout === "desk" &&
        !!homeLayout?.permissions.canIntegrationRead,
    },
  );

  const { data: completedSteps } = trpc.organization.setupSteps.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId && effectiveLayout === "desk" },
  );

  const { data: actionQueue, isLoading: actionQueueLoading } = trpc.tasks.actionQueue.useQuery(
    { organizationId: organizationId!, limit: 5, includeOrgWide: effectiveLayout !== "field" },
    { enabled: !!organizationId && !!effectiveLayout },
  );

  const completeStep = trpc.organization.completeSetupStep.useMutation({
    onSuccess: () => void utils.organization.setupSteps.invalidate(),
  });

  const doneKeys = new Set((completedSteps ?? []).map((s) => s.stepKey));

  if (!organizationId) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-base text-zinc-600">
        <p className="font-semibold text-zinc-900">Select an organization</p>
        <OrgSwitcher />
      </div>
    );
  }

  if (layoutLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-zinc-200 bg-white p-8 text-base text-zinc-600"
      >
        Loading workspace…
      </div>
    );
  }

  if (effectiveLayout === "field" && homeLayout) {
    return (
      <>
        <DashboardFieldLauncher
          orgName={orgName}
          permissions={homeLayout.permissions}
          actionQueue={actionQueue}
          actionQueueLoading={actionQueueLoading}
        />
        <p className="mt-6 text-center text-xs text-zinc-500">
          Prefer the overview tiles?{" "}
          <Link
            href="/dashboard?view=desk"
            className="font-medium text-emerald-900 underline underline-offset-2"
          >
            Open full operations dashboard
          </Link>
        </p>
      </>
    );
  }

  return (
    <CommandCenterDeskView
      organizationId={organizationId}
      orgName={orgName}
      cc={cc}
      ccLoading={ccLoading}
      actionQueue={actionQueue}
      actionQueueLoading={actionQueueLoading}
      integrationHealth={integrationHealth}
      doneKeys={doneKeys}
      onCompleteSetupStep={(stepKey) => completeStep.mutate({ organizationId, stepKey })}
      completeSetupStepPending={completeStep.isPending}
    />
  );
}
