"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardGroupedNav } from "@/components/dashboard-grouped-nav";
import { DashboardNavBadgeProvider } from "@/components/dashboard-nav-badge-context";
import { DashboardSiteHeader } from "@/components/dashboard-site-header";

/**
 * Header + nav chrome for the sole shell (ADR-UX-002 / AC-012).
 * Nav authority: dashboard-nav-links + server-backed filterDashboardNavSections.
 * Calm Focus quietness: slate rail subordinate; content region lightest (ADR-UX-005).
 */
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
      <div data-dashboard-shell="authenticated" className="flex min-h-0 flex-1 flex-col bg-background">
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
              className="absolute inset-0 bg-slate-900/40"
              onClick={closeDrawer}
            />
            <div className="absolute bottom-0 left-0 top-0 flex w-[min(22rem,calc(100vw-3rem))] flex-col bg-surface shadow-[var(--shadow-card)]">
              <div className="flex h-12 items-center justify-between border-b border-border px-4 sm:h-14">
                <span className="text-base font-semibold text-foreground">Menu</span>
                <button
                  type="button"
                  className="touch-target rounded-md px-4 py-2 text-base font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
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
            data-dashboard-chrome="nav-rail"
            className="nav-rail hidden w-56 shrink-0 overflow-y-auto border-r md:block xl:w-60"
          >
            <DashboardGroupedNav variant="sidebar" />
          </aside>

          {/* Content column only — #main-content lives on the page surface inside
              DashboardWorkspace so shell chrome (session strip, What's new) is
              excluded from Today density measurement (ADR-UX-006 / AC-CF-D005). */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
            {children}
          </div>
        </div>
      </div>
    </DashboardNavBadgeProvider>
  );
}
