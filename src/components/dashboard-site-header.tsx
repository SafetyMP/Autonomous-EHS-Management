"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DASHBOARD_NAV_LINKS } from "@/lib/dashboard-nav-links";

const navLinkClassName =
  "inline-flex min-h-11 touch-target items-center rounded-md px-3 py-2 text-base text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:text-sm";

const brandLinkClassName =
  "inline-flex min-h-11 touch-target items-center rounded-md px-2 py-2 font-semibold text-emerald-800 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

const homeLinkClassName =
  "inline-flex min-h-11 touch-target items-center rounded-md px-3 py-2 text-base text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:text-sm";

const MOBILE_NAV_PANEL_ID = "dashboard-primary-nav-mobile";

export function DashboardSiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, closeMenu]);

  return (
    <header className="border-b border-zinc-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-6">
          <Link href="/dashboard" className={brandLinkClassName}>
            EHS Console
          </Link>
          <nav
            aria-label="Primary"
            className="hidden max-w-3xl flex-wrap gap-x-1 gap-y-1 sm:flex"
          >
            {DASHBOARD_NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={navLinkClassName}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="relative w-full border-t border-zinc-100 pt-2 sm:hidden">
            <button
              ref={menuButtonRef}
              type="button"
              aria-expanded={menuOpen}
              aria-controls={MOBILE_NAV_PANEL_ID}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              id="dashboard-menu-button"
              onClick={() => setMenuOpen((o) => !o)}
              className="touch-target flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-zinc-50 px-4 py-2 text-base font-semibold text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
            {menuOpen ? "Close menu" : "Menu"}
            </button>
            {menuOpen ? (
              <div
                id={MOBILE_NAV_PANEL_ID}
                role="group"
                aria-label="Site sections"
                className="mt-2 flex flex-col gap-1 border border-zinc-200 bg-white py-3 shadow-sm"
              >
                {DASHBOARD_NAV_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={navLinkClassName}
                    onClick={closeMenu}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <Link href="/" className={homeLinkClassName}>
            Home
          </Link>
        </div>
      </div>
    </header>
  );
}
