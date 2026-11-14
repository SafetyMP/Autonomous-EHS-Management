"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
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
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const drawer = drawerRef.current;
    const background = backgroundRef.current;
    const header = headerRef.current;
    if (background) background.inert = true;
    if (header) header.inert = true;
    drawer?.querySelector<HTMLButtonElement>("button")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawer) return;
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex="0"]',
      )).filter((element) => {
        if (element.tabIndex < 0 || element.getClientRects().length === 0) return false;
        const style = window.getComputedStyle(element);
        if (style.visibility === "hidden" || style.visibility === "collapse") return false;
        // Chromium can report geometry for links inside a closed details element.
        // Only its first summary (and that summary's children) remains focusable.
        for (let ancestor = element.parentElement; ancestor && ancestor !== drawer; ancestor = ancestor.parentElement) {
          if (ancestor instanceof HTMLDetailsElement && !ancestor.open) {
            const summary = Array.from(ancestor.children).find((child) => child.tagName === "SUMMARY");
            if (!summary?.contains(element)) return false;
          }
        }
        return true;
      });
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    const desktop = window.matchMedia("(min-width: 768px)");
    function onDesktop(event: MediaQueryListEvent) {
      if (event.matches) setMobileDrawerOpen(false);
    }
    desktop.addEventListener("change", onDesktop);
    document.addEventListener("keydown", onKey);
    return () => {
      desktop.removeEventListener("change", onDesktop);
      document.removeEventListener("keydown", onKey);
      if (background) background.inert = false;
      if (header) header.inert = false;
      previousFocus?.focus();
    };
  }, [mobileDrawerOpen]);

  return (
    <DashboardNavBadgeProvider>
      <div data-dashboard-shell="authenticated" className="flex min-h-0 flex-1 flex-col bg-background">
        <div ref={headerRef} className="sticky top-0 z-40"><DashboardSiteHeader onMenuClick={openDrawer} menuOpen={mobileDrawerOpen} /></div>

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
              tabIndex={-1}
              onClick={closeDrawer}
            />
            <div id="workspace-navigation" ref={drawerRef} className="absolute bottom-0 left-0 top-0 flex w-[min(22rem,calc(100vw-3rem))] flex-col bg-surface shadow-[var(--shadow-card)]">
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

        <div ref={backgroundRef} className="flex min-h-0 flex-1">
          <aside
            aria-label="Workspace"
            data-dashboard-chrome="nav-rail"
            className="nav-rail hidden w-64 shrink-0 overflow-y-auto border-r md:block xl:w-72"
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
