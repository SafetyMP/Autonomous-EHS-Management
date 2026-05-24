"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardGroupedNav } from "@/components/dashboard-grouped-nav";
import { DashboardNavBadgeProvider } from "@/components/dashboard-nav-badge-context";
import { DashboardSiteHeader } from "@/components/dashboard-site-header";

export function DashboardAuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const openDrawer = useCallback(() => setMobileDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setMobileDrawerOpen(false), []);

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileDrawerOpen]);

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileDrawerOpen]);

  return (
    <DashboardNavBadgeProvider>
      <DashboardSiteHeader onMenuClick={openDrawer} />

      {mobileDrawerOpen ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Workspace navigation"
        >
          <button
            type="button"
            aria-label="Close workspace navigation"
            className="absolute inset-0 bg-zinc-900/40"
            onClick={closeDrawer}
          />
          <div className="absolute left-0 top-0 bottom-0 flex w-[min(22rem,calc(100vw-3rem))] flex-col bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <span className="text-base font-semibold text-zinc-900">Menu</span>
              <button
                type="button"
                className="touch-target rounded-md px-4 py-2 text-base font-medium text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                onClick={closeDrawer}
              >
                Close
              </button>
            </div>
            <DashboardGroupedNav variant="drawer" onNavigate={closeDrawer} />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Workspace"
          className="hidden w-56 shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50 md:block xl:w-60"
        >
          <DashboardGroupedNav variant="sidebar" />
        </aside>

        <div
          id="main-content"
          tabIndex={-1}
          className="flex min-h-0 min-w-0 flex-1 flex-col outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
        >
          {children}
        </div>
      </div>
    </DashboardNavBadgeProvider>
  );
}
