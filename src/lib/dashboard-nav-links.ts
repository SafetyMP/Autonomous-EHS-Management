export type DashboardNavItem = {
  readonly href: string;
  readonly label: string;
};

export type DashboardNavSection = {
  readonly title: string;
  readonly ariaLabel?: string;
  readonly items: readonly DashboardNavItem[];
};

/** Grouped sidebar / drawer navigation (lifecycle-oriented program flow). */
export const DASHBOARD_NAV_SECTIONS: readonly DashboardNavSection[] = [
  {
    title: "Today",
    ariaLabel: "Personal work and approvals",
    items: [
      { href: "/dashboard", label: "Command center" },
      { href: "/dashboard/tasks", label: "Tasks & reviews" },
      { href: "/dashboard/approvals", label: "Approvals" },
    ],
  },
  {
    title: "Report & respond",
    ariaLabel: "Field intake and response",
    items: [
      { href: "/dashboard/incidents", label: "Incidents" },
      { href: "/dashboard/observations", label: "Observations" },
      { href: "/dashboard/inspections", label: "Inspections" },
    ],
  },
  {
    title: "Permits",
    ariaLabel: "Work and regulatory permits",
    items: [
      { href: "/dashboard/permits", label: "Work permits (PTW)" },
      { href: "/dashboard/environmental-permits", label: "Regulatory env permits" },
    ],
  },
  {
    title: "Corrective action",
    ariaLabel: "Corrective and preventive action",
    items: [{ href: "/dashboard/capa", label: "CAPA register" }],
  },
  {
    title: "Plan & programme",
    ariaLabel: "Planning and environmental programme registers",
    items: [
      { href: "/dashboard/planning", label: "Planning hub" },
      { href: "/dashboard/heat-program", label: "Heat NEP program aid" },
      { href: "/dashboard/risk-assessments", label: "Risk assessments" },
      { href: "/dashboard/environment", label: "Environment" },
      { href: "/dashboard/chemicals", label: "Chemical inventory" },
    ],
  },
  {
    title: "Assure & improve",
    ariaLabel: "Assurance and management review",
    items: [
      { href: "/dashboard/audits", label: "Internal audits" },
      { href: "/dashboard/assurance", label: "Assurance hub" },
      { href: "/dashboard/management-review", label: "Mgmt review" },
    ],
  },
  {
    title: "Records & metrics",
    ariaLabel: "Documented information and metrics",
    items: [
      { href: "/dashboard/documents", label: "Documents" },
      { href: "/dashboard/rag", label: "Knowledge corpus" },
      { href: "/dashboard/audit-trail", label: "Audit trail" },
      { href: "/dashboard/retention", label: "Retention" },
      { href: "/dashboard/analytics", label: "Metrics" },
      { href: "/dashboard/analytics/incidence-rates", label: "Incidence rates" },
    ],
  },
  {
    title: "People",
    ariaLabel: "Training and contractors",
    items: [
      { href: "/dashboard/training", label: "Training" },
      { href: "/dashboard/contractors", label: "Contractors" },
    ],
  },
  {
    title: "Administration",
    ariaLabel: "Management system administration",
    items: [
      { href: "/dashboard/program", label: "Program overview" },
      { href: "/dashboard/emergency", label: "Emergency prep" },
      { href: "/dashboard/moc", label: "Management of change" },
      { href: "/dashboard/import", label: "Import" },
      { href: "/dashboard/integrations", label: "Integrations" },
      { href: "/dashboard/privacy-requests", label: "Privacy" },
      { href: "/dashboard/context", label: "Organization context (ISO 4)" },
      { href: "/dashboard/workflow-catalog", label: "Workflow catalog" },
    ],
  },
];

/** Flattened ordered list — for tooling and legacy lookups. */
export const DASHBOARD_NAV_LINKS: readonly DashboardNavItem[] = DASHBOARD_NAV_SECTIONS.flatMap((s) => [
  ...s.items,
]);
