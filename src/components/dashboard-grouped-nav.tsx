"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardNavBadges } from "@/components/dashboard-nav-badge-context";
import type { DashboardNavSection } from "@/lib/dashboard-nav-links";
import { DASHBOARD_NAV_SECTIONS } from "@/lib/dashboard-nav-links";

const navItemClass =
  "inline-flex min-h-11 w-full touch-target items-center rounded-md px-3 py-2 text-base text-zinc-800 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 md:text-sm";

const navItemActiveClass = " bg-emerald-50 font-semibold text-emerald-950";

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-amber-950 tabular-nums"
      aria-label={`${count} pending`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function badgeCountForHref(
  href: string,
  badges: { tasksCount: number; approvalsCount: number },
): number {
  if (href === "/dashboard/tasks") return badges.tasksCount;
  if (href === "/dashboard/approvals") return badges.approvalsCount;
  return 0;
}

export function DashboardGroupedNav({
  onNavigate,
  variant = "sidebar",
}: {
  onNavigate?: () => void;
  variant?: "sidebar" | "drawer";
}) {
  const pathname = usePathname();
  const badges = useDashboardNavBadges();

  const renderLink = (item: { href: string; label: string }) => {
    const count = badgeCountForHref(item.href, badges);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={pathname === item.href ? "page" : undefined}
        className={`${navItemClass}${pathname === item.href ? navItemActiveClass : ""}${count > 0 ? " justify-between gap-2" : ""}`}
        onClick={onNavigate}
      >
        <span>{item.label}</span>
        <NavBadge count={count} />
      </Link>
    );
  };

  return (
    <div
      className={
        variant === "drawer"
          ? "flex max-h-[min(70vh,calc(100vh-8rem))] flex-col gap-2 overflow-y-auto px-4 py-3"
          : "flex flex-col gap-4 px-3 py-4"
      }
    >
      {DASHBOARD_NAV_SECTIONS.map((section: DashboardNavSection) =>
        variant === "drawer" ? (
          <details key={section.title} className="group rounded-md border border-zinc-200 bg-zinc-50">
            <summary className="min-h-11 cursor-pointer touch-target select-none px-3 py-2 font-semibold text-zinc-900 marker:text-emerald-800">
              {section.title}
            </summary>
            <nav aria-label={section.ariaLabel ?? section.title} className="flex flex-col gap-0 border-t border-zinc-200 bg-white py-2">
              {section.items.map((item) => (
                <div key={item.href} className="pl-3">
                  {renderLink(item)}
                </div>
              ))}
            </nav>
          </details>
        ) : (
          <nav key={section.title} aria-label={section.ariaLabel ?? section.title} className="flex flex-col gap-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-zinc-700">{section.title}</p>
            {section.items.map((item) => renderLink(item))}
          </nav>
        ),
      )}
    </div>
  );
}
