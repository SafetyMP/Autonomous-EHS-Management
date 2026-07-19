"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardNavBadges } from "@/components/dashboard-nav-badge-context";
import { useOrg } from "@/components/org-context";
import type { DashboardNavSection } from "@/lib/dashboard-nav-links";
import {
  navSectionsForUser,
  sectionContainsPath,
  sectionShouldExpandByDefault,
} from "@/lib/dashboard-nav-filter";
import { trpc } from "@/trpc/react";

const navItemClass =
  "inline-flex min-h-11 w-full touch-target items-center rounded-md px-3 py-2 text-base text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 md:text-sm";

const navItemActiveClass = " bg-primary-soft font-semibold text-primary";

function navItemIsActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

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

function SecondaryNavCluster({
  section,
  pathname,
  renderLink,
  variant,
}: {
  section: DashboardNavSection;
  pathname: string;
  renderLink: (item: { href: string; label: string }) => ReactNode;
  variant: "sidebar" | "drawer";
}) {
  const open = sectionShouldExpandByDefault(section, pathname);
  return (
    <details
      key={section.title}
      open={open}
      className={
        variant === "drawer"
          ? "group rounded-md border border-zinc-200 bg-zinc-50"
          : "group rounded-md border border-zinc-200/80 bg-zinc-50/60"
      }
    >
      <summary className="min-h-11 cursor-pointer touch-target select-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-700 marker:text-emerald-800">
        {section.title}
      </summary>
      <nav
        aria-label={section.ariaLabel ?? section.title}
        className={
          variant === "drawer"
            ? "flex flex-col gap-0 border-t border-zinc-200 bg-white py-2"
            : "flex flex-col gap-1 border-t border-zinc-200/80 bg-white py-2"
        }
      >
        {section.items.map((item) => (
          <div key={item.href} className={variant === "drawer" ? "pl-3" : ""}>
            {renderLink(item)}
          </div>
        ))}
      </nav>
    </details>
  );
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
  const { organizationId } = useOrg();

  const { data: homeLayout } = trpc.organization.dashboardHomeLayout.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const sections: readonly DashboardNavSection[] = homeLayout
    ? navSectionsForUser({
        layout: homeLayout.layout,
        isAdmin: homeLayout.isAdmin,
        canIntegrationRead: homeLayout.permissions.canIntegrationRead,
        canAuditTrailRead: homeLayout.permissions.canAuditTrailRead,
      })
    : [];

  const renderLink = (item: { href: string; label: string }) => {
    const count = badgeCountForHref(item.href, badges);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={navItemIsActive(pathname, item.href) ? "page" : undefined}
        className={`${navItemClass}${navItemIsActive(pathname, item.href) ? navItemActiveClass : ""}${count > 0 ? " justify-between gap-2" : ""}`}
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
      {sections.map((section: DashboardNavSection) => {
        if (section.cluster === "secondary") {
          return (
            <SecondaryNavCluster
              key={section.title}
              section={section}
              pathname={pathname}
              renderLink={renderLink}
              variant={variant}
            />
          );
        }

        if (variant === "drawer") {
          return (
            <details
              key={section.title}
              open={sectionContainsPath(section, pathname) || section.cluster === "primary"}
              className="group rounded-md border border-zinc-200 bg-zinc-50"
            >
              <summary className="min-h-11 cursor-pointer touch-target select-none px-3 py-2 font-semibold text-zinc-900 marker:text-emerald-800">
                {section.title}
              </summary>
              <nav
                aria-label={section.ariaLabel ?? section.title}
                className="flex flex-col gap-0 border-t border-zinc-200 bg-white py-2"
              >
                {section.items.map((item) => (
                  <div key={item.href} className="pl-3">
                    {renderLink(item)}
                  </div>
                ))}
              </nav>
            </details>
          );
        }

        return (
          <nav key={section.title} aria-label={section.ariaLabel ?? section.title} className="flex flex-col gap-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-zinc-700">{section.title}</p>
            {section.items.map((item) => renderLink(item))}
          </nav>
        );
      })}
    </div>
  );
}
