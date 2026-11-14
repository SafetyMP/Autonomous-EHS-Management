"use client";

import Link from "next/link";
import { OrgSwitcher } from "@/components/org-switcher";

export function DashboardSiteHeader({ onMenuClick, menuOpen = false }: {
  onMenuClick?: () => void;
  menuOpen?: boolean;
}) {
  return (
    <header aria-label="EHS Console site" data-dashboard-chrome="site-header"
      className="border-b border-border bg-surface pt-[max(0px,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-[90rem] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onMenuClick} aria-label="Open workspace menu" aria-expanded={menuOpen} aria-controls="workspace-navigation"
            className="min-h-11 rounded-md border border-border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus md:hidden">Menu</button>
          <Link href="/dashboard" className="font-display inline-flex min-h-11 items-center rounded-md text-lg font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
            <span className="sr-only">Autonomous EHS — </span>EHS Console
          </Link>
        </div>
        <div className="w-full min-w-0 border-t border-border pt-2 sm:ml-auto sm:w-64 sm:border-0 sm:pt-0"><OrgSwitcher /></div>
        <Link href="/dashboard" className="hidden min-h-11 items-center rounded-md px-3 text-sm text-text-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus lg:inline-flex">Overview</Link>
      </div>
    </header>
  );
}
