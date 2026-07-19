export type DashboardNavItem = {
  readonly href: string;
  readonly label: string;
};

/** Primary = Today/Capture/Decide/Prove chrome; secondary = Connected/Plumbing clusters. */
export type DashboardNavCluster = "primary" | "secondary";

export type DashboardNavSection = {
  readonly title: string;
  readonly ariaLabel?: string;
  readonly cluster: DashboardNavCluster;
  readonly items: readonly DashboardNavItem[];
};

/**
 * Grouped sidebar / drawer navigation — task-first primary modes, then secondary
 * programme breadth (Connected/Plumbing). Core spine hrefs are stable.
 */
export const DASHBOARD_NAV_SECTIONS: readonly DashboardNavSection[] = [
  {
    title: "Today",
    ariaLabel: "Personal work queue and next actions",
    cluster: "primary",
    items: [
      { href: "/dashboard", label: "Command center" },
      { href: "/dashboard/tasks", label: "Tasks & reviews" },
    ],
  },
  {
    title: "Capture",
    ariaLabel: "Field and desk intake",
    cluster: "primary",
    items: [
      { href: "/dashboard/incidents", label: "Incidents" },
      { href: "/dashboard/observations", label: "Observations" },
      { href: "/dashboard/inspections", label: "Inspections" },
      { href: "/dashboard/permits", label: "Work permits (PTW)" },
    ],
  },
  {
    title: "Decide",
    ariaLabel: "Human gates and corrective action",
    cluster: "primary",
    items: [
      { href: "/dashboard/approvals", label: "Approvals" },
      { href: "/dashboard/capa", label: "CAPA register" },
    ],
  },
  {
    title: "Prove",
    ariaLabel: "Audit trail and evidence registers",
    cluster: "primary",
    items: [
      { href: "/dashboard/audit-trail", label: "Audit trail" },
      { href: "/dashboard/documents", label: "Documents" },
    ],
  },
  {
    title: "Plan & programme",
    ariaLabel: "Planning and environmental programme registers",
    cluster: "secondary",
    items: [
      { href: "/dashboard/planning", label: "Planning hub" },
      { href: "/dashboard/heat-program", label: "Heat NEP program aid" },
      { href: "/dashboard/risk-assessments", label: "Risk assessments" },
      { href: "/dashboard/environment", label: "Environment" },
      { href: "/dashboard/chemicals", label: "Chemical inventory" },
      { href: "/dashboard/environmental-permits", label: "Regulatory env permits" },
    ],
  },
  {
    title: "Assure & improve",
    ariaLabel: "Assurance and management review",
    cluster: "secondary",
    items: [
      { href: "/dashboard/audits", label: "Internal audits" },
      { href: "/dashboard/assurance", label: "Assurance hub" },
      { href: "/dashboard/management-review", label: "Mgmt review" },
    ],
  },
  {
    title: "Records & metrics",
    ariaLabel: "Knowledge corpus and safety metrics",
    cluster: "secondary",
    items: [
      { href: "/dashboard/rag", label: "Knowledge corpus" },
      { href: "/dashboard/retention", label: "Retention" },
      { href: "/dashboard/analytics", label: "Metrics" },
      { href: "/dashboard/analytics/incidence-rates", label: "Incidence rates" },
    ],
  },
  {
    title: "People",
    ariaLabel: "Training and contractors",
    cluster: "secondary",
    items: [
      { href: "/dashboard/training", label: "Training" },
      { href: "/dashboard/contractors", label: "Contractors" },
    ],
  },
  {
    title: "Administration",
    ariaLabel: "Management system administration",
    cluster: "secondary",
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

/** Core spine hrefs — must remain stable across IA regroup (AC-010). */
export const CORE_SPINE_HREFS = [
  "/dashboard/incidents",
  "/dashboard/capa",
  "/dashboard/inspections",
  "/dashboard/approvals",
  "/dashboard/audit-trail",
] as const;
