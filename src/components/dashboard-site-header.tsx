"use client";

import Link from "next/link";

const brandLinkClassName =
  "inline-flex min-h-11 touch-target items-center rounded-md px-2 py-2 font-semibold text-emerald-800 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

const homeLinkClassName =
  "inline-flex min-h-11 touch-target items-center rounded-md px-3 py-2 text-base text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:text-sm";

const menuBtnClass =
  "touch-target inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-zinc-50 px-4 py-2 text-base font-semibold text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 md:hidden";

export function DashboardSiteHeader({
  onMenuClick,
}: {
  /** Opens mobile drawer; desktop uses sidebar inside layout. */
  onMenuClick?: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-3 px-4 pb-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link href="/dashboard" className={brandLinkClassName}>
            <span className="sr-only">Autonomous EHS — </span>
            EHS Console
          </Link>
          <button type="button" className={menuBtnClass} onClick={onMenuClick} aria-label="Open workspace menu">
            Menu
          </button>
        </div>
        <nav aria-label="Account" className="flex shrink-0 items-center gap-2">
          <Link href="/" className={homeLinkClassName}>
            Home
          </Link>
        </nav>
      </div>
    </header>
  );
}
