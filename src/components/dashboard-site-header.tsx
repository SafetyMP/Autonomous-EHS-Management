"use client";

import Link from "next/link";

const brandLinkClassName =
  "inline-flex min-h-11 touch-target items-center rounded-md px-2 py-2 font-semibold text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2";

const homeLinkClassName =
  "inline-flex min-h-11 touch-target items-center rounded-md px-3 py-2 text-base text-text-subtle hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 sm:text-sm";

const menuBtnClass =
  "touch-target inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border-strong bg-surface-muted px-4 py-2 text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 md:hidden";

export function DashboardSiteHeader({
  onMenuClick,
}: {
  /** Opens mobile drawer; desktop uses sidebar inside layout. */
  onMenuClick?: () => void;
}) {
  return (
    <header
      aria-label="EHS Console site"
      className="sticky top-0 z-40 border-b border-border bg-surface pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-3 px-[max(1rem,env(safe-area-inset-left))] pb-3 pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))]">
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
