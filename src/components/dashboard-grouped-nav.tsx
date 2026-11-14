"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardNavBadges } from "@/components/dashboard-nav-badge-context";
import { useOrg } from "@/components/org-context";
import { dashboardDestinationForPath, type DashboardNavItem } from "@/lib/dashboard-nav-links";
import { navSectionsForUser, sectionShouldExpandByDefault } from "@/lib/dashboard-nav-filter";
import { trpc } from "@/trpc/react";

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
  const [search, setSearch] = useState("");
  const searchId = useId();
  const isRail = variant === "sidebar";
  const { data: homeLayout, isLoading, isError, refetch } = trpc.organization.dashboardHomeLayout.useQuery(
    { organizationId: organizationId ?? "" },
    { enabled: !!organizationId },
  );
  const sections = homeLayout ? navSectionsForUser({
    layout: homeLayout.layout,
    isAdmin: homeLayout.isAdmin,
    canIntegrationRead: homeLayout.permissions.canIntegrationRead,
    canAuditTrailRead: homeLayout.permissions.canAuditTrailRead,
  }) : [];
  const query = search.trim().toLocaleLowerCase();
  const matches = sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => !query || `${section.title} ${item.label}`.toLocaleLowerCase().includes(query)),
  })).filter((section) => section.items.length > 0);
  const activeHref = dashboardDestinationForPath(pathname)?.href;
  const itemClass = isRail
    ? "nav-rail-item inline-flex min-h-11 w-full items-center gap-2 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-on-dark"
    : "inline-flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus";

  function renderLink(item: DashboardNavItem) {
    const count = item.href === "/dashboard/tasks" ? badges.tasksCount : item.href === "/dashboard/approvals" ? badges.approvalsCount : 0;
    const active = item.href === activeHref;
    return (
      <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
        className={`${itemClass}${active && !isRail ? " bg-primary-soft font-semibold text-primary" : ""}`}
        onClick={onNavigate}>
        <span>{item.label}</span>
        {count > 0 ? <span className="ml-auto rounded-full bg-amber-500 px-1.5 text-xs font-bold text-amber-950" aria-label={`${count} pending`}>{count > 99 ? "99+" : count}</span> : null}
      </Link>
    );
  }

  return (
    <div className={`flex flex-col gap-2 px-3 py-4 ${isRail ? "text-slate-200" : "min-h-0 flex-1 overflow-y-auto text-foreground"}`}>
      <label htmlFor={searchId} className="px-1 text-xs font-semibold">Find a workspace</label>
      <input id={searchId} type="search" value={search} onChange={(event) => setSearch(event.target.value)}
        placeholder="Search navigation…"
        className="mb-3 min-h-11 w-full min-w-0 rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" />
      {!organizationId ? <p className="px-1 text-sm" role="status">Choose an organization above to open your workspace.</p> : null}
      {organizationId && isLoading ? <p className="px-1 text-sm" role="status">Loading navigation…</p> : null}
      {isError ? <div className="px-1 text-sm" role="alert"><p>Navigation could not be loaded.</p><button type="button" onClick={() => void refetch()} className="min-h-11 underline">Try again</button></div> : null}
      {homeLayout && matches.length === 0 ? <p className="px-1 text-sm" role="status">No destinations match “{search}”. Try incidents, actions, or reports.</p> : null}
      {matches.map((section) => {
        if (section.title === "Overview") return <nav key={section.title} aria-label="Overview">{section.items.map(renderLink)}</nav>;
        const current = sectionShouldExpandByDefault(section, pathname);
        return (
          <details key={`${section.title}:${pathname}:${Boolean(query)}`} open={current || Boolean(query)}
            className={section.cluster === "secondary" ? `mt-4 border-t pt-4 ${isRail ? "border-slate-700" : "border-border"}` : ""}>
            <summary className={`min-h-11 cursor-pointer rounded-md px-2 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 ${isRail ? "marker:text-primary-on-dark focus-visible:ring-primary-on-dark" : "marker:text-primary focus-visible:ring-focus"} ${current ? isRail ? "text-primary-on-dark" : "text-primary" : ""}`}>
              {section.title}
            </summary>
            <nav aria-label={section.ariaLabel ?? section.title} className={`ml-3 flex flex-col gap-1 border-l pl-2 ${isRail ? "border-slate-700" : "border-border"}`}>
              {section.items.map(renderLink)}
            </nav>
          </details>
        );
      })}
    </div>
  );
}
