import type { DashboardNavSection } from "@/lib/dashboard-nav-links";
import { DASHBOARD_NAV_SECTIONS } from "@/lib/dashboard-nav-links";

export type NavFilterInput = {
  /** Server heuristic: field launcher vs desk command center */
  layout: "field" | "desk";
  isAdmin: boolean;
  canIntegrationRead: boolean;
  canAuditTrailRead: boolean;
};

/**
 * Field-focused roles see fewer nav items — management-system admin routes are hidden
 * unless the user has integration or audit-trail read (or org admin).
 *
 * AC-014 / ADR-UX-002: layout + permission flags MUST come from server
 * `organization.dashboardHomeLayout` (userHasPermission). CSS-only or client-only
 * isField flags without server confirmation are forbidden. Nav hide is defense-in-depth;
 * page-level assertPermission remains authoritative.
 */
export function filterDashboardNavSections(
  sections: readonly DashboardNavSection[],
  input: NavFilterInput,
): readonly DashboardNavSection[] {
  const showManagementSystem =
    input.isAdmin || input.canIntegrationRead || input.canAuditTrailRead || input.layout === "desk";

  if (showManagementSystem) return sections;

  // Preserve the existing field-role visibility boundary after regrouping routes.
  const managementRoutes = new Set([
    "/dashboard/program", "/dashboard/emergency", "/dashboard/moc",
    "/dashboard/import", "/dashboard/integrations", "/dashboard/privacy-requests",
    "/dashboard/context", "/dashboard/workflow-catalog",
  ]);
  return sections
    .map((section) => ({ ...section, items: section.items.filter((item) => !managementRoutes.has(item.href)) }))
    .filter((section) => section.items.length > 0);
}

export function navSectionsForUser(input: NavFilterInput): readonly DashboardNavSection[] {
  return filterDashboardNavSections(DASHBOARD_NAV_SECTIONS, input);
}

export function sectionContainsPath(section: DashboardNavSection, pathname: string): boolean {
  return section.items.some(
    (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)),
  );
}

/** Keep the current work area open; all area names remain visible. */
export function sectionShouldExpandByDefault(
  section: DashboardNavSection,
  pathname: string,
): boolean {
  return sectionContainsPath(section, pathname);
}
