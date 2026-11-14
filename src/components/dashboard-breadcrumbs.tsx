"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_NAV_SECTIONS, dashboardDestinationForPath } from "@/lib/dashboard-nav-links";

/** Route-aware wayfinding without exposing identifiers or guessing record titles. */
export function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const destination = dashboardDestinationForPath(pathname);
  if (!destination || pathname === "/dashboard") return null;
  const section = DASHBOARD_NAV_SECTIONS.find((item) => item.items.some((link) => link.href === destination.href));
  const isDetail = pathname !== destination.href;
  const currentLabel = pathname.endsWith("/new") ? "New record" : "Record details";
  const linkClass = "rounded underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus";
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li><Link href="/dashboard" className={linkClass}>Overview</Link></li>
        {section ? <li><span aria-hidden="true" className="mr-2">/</span>{section.title}</li> : null}
        <li><span aria-hidden="true" className="mr-2">/</span>{isDetail ? <Link href={destination.href} className={linkClass}>{destination.label}</Link> : <span aria-current="page" className="font-medium text-foreground">{destination.label}</span>}</li>
        {isDetail ? <li><span aria-hidden="true" className="mr-2">/</span><span aria-current="page" className="font-medium text-foreground">{currentLabel}</span></li> : null}
      </ol>
    </nav>
  );
}
