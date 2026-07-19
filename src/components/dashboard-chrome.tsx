"use client";

import { PwaInstallHint } from "@/components/pwa-install-hint";
import { DashboardShell } from "@/components/dashboard-shell";

/**
 * Sole authenticated shell entry (ADR-UX-002 / AC-012).
 * Composition: layout.tsx → DashboardChrome → DashboardShell → authenticated layout.
 */
export function DashboardChrome({ children }: { children: React.ReactNode }) {
  return (
    <div data-dashboard-shell="chrome" data-theme-scope="calm" className="flex min-h-full flex-col bg-background">
      {/* Quiet chrome strip — no hero gradient (ADR-UX-005 / AC-CF-V006) */}
      <div className="shrink-0 border-b border-border bg-surface-muted px-3 py-2 md:px-4 md:py-2">
        <div className="mx-auto max-w-[90rem]">
          <PwaInstallHint />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <DashboardShell workspaceWidth="wide">{children}</DashboardShell>
      </div>
    </div>
  );
}
