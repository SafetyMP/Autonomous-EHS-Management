"use client";

import { PwaInstallHint } from "@/components/pwa-install-hint";
import { DashboardShell } from "@/components/dashboard-shell";

export function DashboardChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="shrink-0 border-b border-zinc-200 bg-zinc-50/90 px-3 py-2 md:px-4 md:py-2">
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
