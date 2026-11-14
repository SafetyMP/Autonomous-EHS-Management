export type DashboardNavItem = {
  readonly href: string;
  readonly label: string;
};

/** Corporate work areas; administration stays separate from everyday work. */
export type DashboardNavCluster = "primary" | "secondary";

export type DashboardNavSection = {
  readonly title: string;
  readonly ariaLabel?: string;
  readonly cluster: DashboardNavCluster;
  readonly items: readonly DashboardNavItem[];
};

/** Navigation changes labels and grouping only. Existing routes retain their authority. */
export const DASHBOARD_NAV_SECTIONS: readonly DashboardNavSection[] = [
  {
    title: "Overview",
    cluster: "primary",
    items: [{ href: "/dashboard", label: "Overview" }],
  },
  {
    title: "Actions & approvals",
    cluster: "primary",
    items: [
      { href: "/dashboard/tasks", label: "Tasks & reviews" },
      { href: "/dashboard/capa", label: "Corrective actions (CAPA)" },
      { href: "/dashboard/approvals", label: "Approvals" },
    ],
  },
  {
    title: "Incidents & observations",
    cluster: "primary",
    items: [
      { href: "/dashboard/incidents", label: "Incidents" },
      { href: "/dashboard/observations", label: "Observations" },
    ],
  },
  {
    title: "Audits & inspections",
    cluster: "primary",
    items: [
      { href: "/dashboard/audits", label: "Internal audits" },
      { href: "/dashboard/inspections", label: "Inspections" },
      { href: "/dashboard/assurance", label: "Assurance" },
      { href: "/dashboard/management-review", label: "Management review" },
    ],
  },
  {
    title: "Programs & risks",
    cluster: "primary",
    items: [
      { href: "/dashboard/program", label: "Program overview" },
      { href: "/dashboard/planning", label: "Planning" },
      { href: "/dashboard/risk-assessments", label: "Risk assessments" },
      { href: "/dashboard/permits", label: "Work permits (PTW)" },
      { href: "/dashboard/environment", label: "Environment" },
      { href: "/dashboard/environmental-permits", label: "Environmental permits" },
      { href: "/dashboard/chemicals", label: "Chemical inventory" },
      { href: "/dashboard/heat-program", label: "Heat program aid" },
      { href: "/dashboard/training", label: "Training" },
      { href: "/dashboard/contractors", label: "Contractors" },
      { href: "/dashboard/emergency", label: "Emergency preparedness" },
      { href: "/dashboard/moc", label: "Management of change" },
    ],
  },
  {
    title: "Reports & evidence",
    cluster: "primary",
    items: [
      { href: "/dashboard/analytics", label: "Metrics" },
      { href: "/dashboard/analytics/incidence-rates", label: "Incidence rates" },
      { href: "/dashboard/documents", label: "Documents" },
      { href: "/dashboard/audit-trail", label: "Audit trail" },
      { href: "/dashboard/rag", label: "Knowledge library" },
      { href: "/dashboard/retention", label: "Retention" },
    ],
  },
  {
    title: "Administration",
    cluster: "secondary",
    items: [
      { href: "/dashboard/import", label: "Import" },
      { href: "/dashboard/integrations", label: "Integrations" },
      { href: "/dashboard/privacy-requests", label: "Privacy requests" },
      { href: "/dashboard/context", label: "Organization context (ISO 4)" },
      { href: "/dashboard/workflow-catalog", label: "Workflow catalog" },
    ],
  },
];

export const DASHBOARD_NAV_LINKS: readonly DashboardNavItem[] = DASHBOARD_NAV_SECTIONS.flatMap((s) => [
  ...s.items,
]);

/** Deep links remain stable across the corporate navigation redesign. */
export const CORE_SPINE_HREFS = [
  "/dashboard/incidents",
  "/dashboard/capa",
  "/dashboard/inspections",
  "/dashboard/approvals",
  "/dashboard/audit-trail",
] as const;

/** Choose the most specific destination so nested analytics routes have one active link. */
export function dashboardDestinationForPath(pathname: string): DashboardNavItem | undefined {
  return DASHBOARD_NAV_LINKS
    .filter((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
