export type ProductHighlightAudience = "all" | "desk" | "admin";

export type ProductHighlight = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly audience: ProductHighlightAudience;
};

/** Bump when the dismissible banner should reappear for a new release. */
export const PRODUCT_RELEASE_ID = "2026-07-regulatory";

export const PRODUCT_HIGHLIGHTS: readonly ProductHighlight[] = [
  {
    id: "heat-nep",
    title: "Heat NEP program aid",
    description:
      "Appendix I–aligned heat illness self-audit and condition logs for inspection readiness—not a federal heat standard or Cal/OSHA heat engine.",
    href: "/dashboard/heat-program",
    audience: "desk",
  },
  {
    id: "chemical-hazcom",
    title: "Chemical inventory & HCS hazards",
    description:
      "Programme chemical register with EPCRA/HCS 2024 hazard classes—Plumbing UI, not EPA Tier2 Submit.",
    href: "/dashboard/chemicals",
    audience: "desk",
  },
  {
    id: "lifecycle-nav",
    title: "Lifecycle navigation",
    description:
      "Sidebar flows Today → Report → Correct → Assure → Records, matching how safety programs run day to day.",
    href: "/dashboard",
    audience: "all",
  },
  {
    id: "assurance-hub",
    title: "Assurance hub",
    description:
      "Internal audits, certification body visits, and certificates in one place—separate from the transactional audit trail.",
    href: "/dashboard/assurance",
    audience: "desk",
  },
  {
    id: "emergency-prep",
    title: "Emergency prep",
    description: "Tabletop scenarios, drill records, and response contacts for ISO emergency preparedness.",
    href: "/dashboard/emergency",
    audience: "desk",
  },
  {
    id: "moc",
    title: "Management of change",
    description:
      "MOC register with ISO 14001:2026 Clause 6.3–style planning fields—transition programme aid, not CB certification.",
    href: "/dashboard/moc",
    audience: "desk",
  },
  {
    id: "incidence-rates",
    title: "Incidence rates",
    description:
      "TRIR-style analytics from IMS recordables and establishment hours—not a substitute for official OSHA filings.",
    href: "/dashboard/analytics/incidence-rates",
    audience: "desk",
  },
  {
    id: "integrations",
    title: "Integrations & inbound ingest",
    description:
      "HRIS/LMS webhook ingest, roster drift reconcile, connector mappings, and Context Sync for operators.",
    href: "/dashboard/integrations",
    audience: "admin",
  },
  {
    id: "knowledge-corpus",
    title: "Knowledge corpus",
    description: "Upload and search policy documents for proposal-only AI retrieval with cited passages.",
    href: "/dashboard/rag",
    audience: "admin",
  },
  {
    id: "field-layout",
    title: "Field layout & offline outbox",
    description:
      "Large intake buttons and durable outbox replay when connectivity drops—opens like an app when installed.",
    href: "/dashboard?view=field",
    audience: "all",
  },
] as const;

export function filterHighlightsForUser(options: {
  isAdmin: boolean;
  canIntegrationRead: boolean;
  persona?: "desk_contributor" | "desk_supervisor" | "field";
}): ProductHighlight[] {
  const { isAdmin, canIntegrationRead, persona } = options;
  const showDesk = persona !== "field";

  return PRODUCT_HIGHLIGHTS.filter((h) => {
    if (h.audience === "all") return true;
    if (h.audience === "desk") return showDesk;
    if (h.audience === "admin") return isAdmin || canIntegrationRead;
    return false;
  });
}

/** Top highlights for marketing home (no permission filtering). */
export const HOME_FEATURE_HIGHLIGHTS: readonly ProductHighlight[] = PRODUCT_HIGHLIGHTS.slice(0, 6);
