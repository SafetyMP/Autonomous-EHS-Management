"use client";

import { authClient } from "@/lib/auth-client";
import {
  FieldOutboxStatusBar,
  FieldOutboxSuccessToast,
  FieldOutboxUiProvider,
} from "@/components/field-outbox-ui-bridge";
import { FieldOutboxGlobalSync } from "@/components/field-outbox-global-sync";
import { DashboardAuthenticatedLayout } from "@/components/dashboard-authenticated-layout";
import { DashboardWhatsNewBanner } from "@/components/dashboard/dashboard-whats-new-banner";
import { OrgProvider, useOrg } from "@/components/org-context";
import { isFieldOutboxEnabled } from "@/lib/offline/fieldOutbox";
import { trpc } from "@/trpc/react";

/**
 * Session + org gate for the sole shell (ADR-UX-002 / AC-012).
 * Must wrap children with DashboardAuthenticatedLayout — no parallel tree.
 */
export function DashboardShell({
  children,
  workspaceWidth = "wide",
}: {
  children: React.ReactNode;
  /** `wide` supports command-center layout; `standard` restores legacy density. */
  workspaceWidth?: "standard" | "wide";
}) {
  const { data: session, isPending } = authClient.useSession();

  async function signOut() {
    await authClient.signOut();
    window.location.href = "/";
  }

  if (isPending) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-1 items-center justify-center p-8 text-base text-zinc-600"
      >
        Loading session…
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div
        role="alert"
        className={`mx-auto max-w-[90rem] flex-1 p-6 text-base text-red-700`}
      >
        Session expired. Please sign in again.
      </div>
    );
  }

  const shellMax = workspaceWidth === "wide" ? "max-w-[90rem]" : "max-w-6xl";
  const sessionDense = workspaceWidth === "wide";

  return (
    <OrgGate shellMax={shellMax} sessionDense={sessionDense} signOut={signOut} session={session}>
      {children}
    </OrgGate>
  );
}

function OrgGate({
  children,
  shellMax,
  sessionDense,
  signOut,
  session,
}: {
  children: React.ReactNode;
  shellMax: string;
  sessionDense: boolean;
  signOut: () => void;
  session: { user: { name: string; email: string } };
}) {
  const { data: orgs, isLoading } = trpc.organization.mine.useQuery();

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex flex-1 items-center justify-center p-8 text-base text-zinc-600">
        Loading organizations…
      </div>
    );
  }

  if (!orgs?.length) {
    return (
      <div className="mx-auto max-w-[90rem] flex-1 p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-base text-amber-950">
          <p className="font-semibold text-amber-950">No organization membership</p>
          <p className="mt-1 text-amber-900">
            After running <code className="rounded bg-amber-100 px-1">npm run db:seed</code>{" "}
            with your email in{" "}
            <code className="rounded bg-amber-100 px-1">SEED_ADMIN_EMAIL</code>, refresh this
            page to load ISO workspaces and permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <OrgProvider organizations={orgs}>
      <FieldOutboxUiProvider>
        <FieldOutboxGlobalSync />
        <DashboardAuthenticatedLayout>
          <DashboardWorkspace
            shellMax={shellMax}
            sessionDense={sessionDense}
            session={session}
            signOut={signOut}
          >
            {children}
          </DashboardWorkspace>
          {/* Additive success toast only — failures stay in FieldOutboxStatusBar (ADR-UX-003). */}
          <FieldOutboxSuccessToast />
        </DashboardAuthenticatedLayout>
      </FieldOutboxUiProvider>
    </OrgProvider>
  );
}

function DashboardWorkspace({
  children,
  shellMax,
  sessionDense,
  session,
  signOut,
}: {
  children: React.ReactNode;
  shellMax: string;
  sessionDense: boolean;
  session: { user: { name: string; email: string } };
  signOut: () => void;
}) {
  const { organizationId } = useOrg();
  const outboxOn = isFieldOutboxEnabled();

  return (
    <main
      aria-label="Dashboard content"
      data-dashboard-shell="workspace"
      data-organization-id={organizationId ?? ""}
      data-field-outbox-enabled={outboxOn ? "1" : "0"}
      className={`mx-auto flex w-full ${shellMax} flex-1 flex-col gap-4 p-4 sm:p-6`}
    >
      <DashboardWhatsNewBanner />
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 text-base ${
          sessionDense ? "py-2.5 sm:py-2" : "py-3"
        }`}
      >
        <div>
          <span className="text-text-muted">Signed in as </span>
          <span className="font-medium text-foreground">{session.user.name}</span>
          <span className="text-text-muted"> ({session.user.email})</span>
        </div>
        <button type="button" onClick={() => void signOut()} className="btn-secondary touch-target">
          Sign out
        </button>
      </div>
      {/* Status-region-first authority for pending/failed outbox (ADR-UX-003 / AC-015). */}
      <FieldOutboxStatusBar />
      {children}
    </main>
  );
}
