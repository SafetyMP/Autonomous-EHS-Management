export type DashboardNavItem = {
  readonly href: string;
  readonly label: string;
};

export type DashboardNavSection = {
  readonly title: string;
  readonly ariaLabel?: string;
  readonly items: readonly DashboardNavItem[];
};

/** Grouped sidebar / drawer navigation (field-friendly, expandable sections on small screens). */
export const DASHBOARD_NAV_SECTIONS: readonly DashboardNavSection[] = [
  {
    title: "Field & risk",
    ariaLabel: "Field operations and operational risk",
    items: [
      { href: "/dashboard", label: "Command center" },
      { href: "/dashboard/incidents", label: "Incidents" },
      { href: "/dashboard/observations", label: "Observations" },
      { href: "/dashboard/permits", label: "Work permits (PTW)" },
      { href: "/dashboard/risk-assessments", label: "Risk assessments" },
      { href: "/dashboard/inspections", label: "Inspections" },
      { href: "/dashboard/capa", label: "CAPA" },
      { href: "/dashboard/tasks", label: "Tasks & reviews" },
    ],
  },
  {
    title: "Governance",
    ariaLabel: "Program governance reporting and metrics",
    items: [
      { href: "/dashboard/analytics", label: "Metrics" },
      { href: "/dashboard/analytics/incidence-rates", label: "Incidence rates" },
      { href: "/dashboard/approvals", label: "Approvals" },
    ],
  },
  {
    title: "People & contractors",
    ariaLabel: "People and contractors",
    items: [
      { href: "/dashboard/training", label: "Training" },
      { href: "/dashboard/contractors", label: "Contractors" },
    ],
  },
  {
    title: "Assurance",
    ariaLabel: "Assurance",
    items: [
      { href: "/dashboard/environment", label: "Environment" },
      { href: "/dashboard/environmental-permits", label: "Regulatory env permits" },
      { href: "/dashboard/planning", label: "Planning" },
      { href: "/dashboard/audits", label: "Audits" },
      { href: "/dashboard/documents", label: "Documents" },
      { href: "/dashboard/rag", label: "Knowledge corpus" },
      { href: "/dashboard/context", label: "Context" },
    ],
  },
  {
    title: "Management system",
    ariaLabel: "Management system continuity",
    items: [
      { href: "/dashboard/program", label: "Program" },
      { href: "/dashboard/import", label: "Import" },
      { href: "/dashboard/integrations", label: "Integrations" },
      { href: "/dashboard/management-review", label: "Mgmt review" },
      { href: "/dashboard/retention", label: "Retention" },
      { href: "/dashboard/workflow-catalog", label: "Workflow catalog" },
      { href: "/dashboard/privacy-requests", label: "Privacy" },
      { href: "/dashboard/audit-trail", label: "Audit trail" },
    ],
  },
];

/** Flattened ordered list — for tooling and legacy lookups. */
export const DASHBOARD_NAV_LINKS: readonly DashboardNavItem[] = DASHBOARD_NAV_SECTIONS.flatMap((s) => [
  ...s.items,
]);
