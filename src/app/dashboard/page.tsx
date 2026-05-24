"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { CommandCenterDeskView } from "@/components/dashboard/command-center-desk-view";
import { DashboardFieldLauncher } from "@/components/dashboard/dashboard-field-launcher";
import { useOrg } from "@/components/org-context";
import {
  readDashboardHomePreference,
  writeDashboardHomePreference,
  type DashboardHomePreference,
} from "@/lib/dashboard/homeLayoutPreference";
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

  const [storedPreference, setStoredPreference] = useState<DashboardHomePreference>(() =>
    typeof window === "undefined" ? "auto" : readDashboardHomePreference(),
  );

  const orgName = organizations.find((o) => o.id === organizationId)?.name;

  const { data: homeLayout } = trpc.organization.dashboardHomeLayout.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const effectiveLayout: "desk" | "field" | undefined = (() => {
    if (viewOverride === "desk" || viewOverride === "field") return viewOverride;
    if (storedPreference === "desk" || storedPreference === "field") return storedPreference;
    return homeLayout?.layout;
  })();

  const layoutLoading =
    viewOverride !== "desk" && viewOverride !== "field" && storedPreference === "auto" && !homeLayout;

  const { data: cc, isLoading: ccLoading } = trpc.analytics.commandCenter.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId && effectiveLayout === "desk" },
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

  function persistPreference(pref: DashboardHomePreference) {
    writeDashboardHomePreference(pref);
    setStoredPreference(pref);
  }

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
          Field layout shows intake and your pending work first.{" "}
          <Link
            href="/dashboard/tasks"
            className="font-medium text-emerald-900 underline underline-offset-2"
          >
            Task hub
          </Link>
          {" · "}
          <Link
            href="/dashboard?view=desk"
            className="font-medium text-emerald-900 underline underline-offset-2"
            onClick={() => persistPreference("desk")}
          >
            Open full operations dashboard
          </Link>
        </p>
      </>
    );
  }

  const deskPersona =
    homeLayout?.persona === "desk_supervisor" ? "desk_supervisor" : "desk_contributor";

  return (
    <>
      <CommandCenterDeskView
        organizationId={organizationId}
        orgName={orgName}
        persona={deskPersona}
        cc={cc}
        ccLoading={ccLoading}
        actionQueue={actionQueue}
        actionQueueLoading={actionQueueLoading}
        doneKeys={doneKeys}
        onCompleteSetupStep={(stepKey) => completeStep.mutate({ organizationId, stepKey })}
        completeSetupStepPending={completeStep.isPending}
      />
      <p className="mt-6 text-center text-xs text-zinc-500">
        <Link
          href="/dashboard?view=field"
          className="font-medium text-emerald-900 underline underline-offset-2"
          onClick={() => persistPreference("field")}
        >
          Switch to compact field menu
        </Link>
      </p>
    </>
  );
}
