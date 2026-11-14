import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAttentionChips,
  filterAttentionChipsForActionQueue,
} from "@/lib/dashboard/commandCenterSignals";
import {
  filterDashboardNavSections,
  navSectionsForUser,
  sectionContainsPath,
  sectionShouldExpandByDefault,
} from "@/lib/dashboard-nav-filter";
import {
  CORE_SPINE_HREFS,
  DASHBOARD_NAV_LINKS,
  DASHBOARD_NAV_SECTIONS,
  dashboardDestinationForPath,
} from "@/lib/dashboard-nav-links";

const repoRoot = join(import.meta.dirname, "../../..");

function readSrc(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("filterAttentionChipsForActionQueue", () => {
  it("removes personal approval chips when action queue has items", () => {
    const chips = buildAttentionChips({
      approvalsInbox: { myPendingStepsCount: 2 },
      capas: { overdueCount: 0 },
      auditFindings: { openNonConformanceCount: 0 },
      inspections: { overdueScheduledCount: 0 },
      environment: { aspectCount: 0, obligationCount: 0, obligationsReviewOverdue: 0 },
      riskProgram: { overdueReviewCount: 0 },
      environmentalPermits: { renewalAttentionCount: 0 },
      fieldOperations: {
        activePermitsCount: 0,
        pendingPermitApprovalCount: 1,
        activePermitsExpiringWithin7DaysCount: 0,
        nonClosedObservationCount: 0,
        observationFollowUpOverdueCount: 0,
        observationsLast30Days: 0,
      },
      tasksWorkbench: { myOpenItemCount: 0 },
      programAutomation: {
        observationFollowUpEscalationsRecorded90d: 0,
        approvalSlaEscalationsRecorded90d: 0,
      },
      incidents: { openCount: 0 },
    } as Parameters<typeof buildAttentionChips>[0]);

    const filtered = filterAttentionChipsForActionQueue(chips, true);
    expect(filtered.some((c) => c.id === "attention-approval-inbox")).toBe(false);
    expect(filtered.some((c) => c.id === "attention-permit-approval-pending")).toBe(false);
  });
});

describe("filterDashboardNavSections", () => {
  it("hides management system for field-focused users without admin/integration/audit", () => {
    const filtered = filterDashboardNavSections(DASHBOARD_NAV_SECTIONS, {
      layout: "field",
      isAdmin: false,
      canIntegrationRead: false,
      canAuditTrailRead: false,
    });
    expect(filtered.some((s) => s.title === "Administration")).toBe(false);
    expect(filtered.some((s) => s.title === "Programs & risks")).toBe(true);
    const flat = filtered.flatMap((s) => s.items);
    expect(flat.some((i) => i.href === "/dashboard/heat-program")).toBe(true);
    expect(flat.some((i) => i.href === "/dashboard/chemicals")).toBe(true);
    expect(flat).toHaveLength(25);
    expect(flat.some((i) => i.href === "/dashboard/retention")).toBe(true);
    for (const href of [
      "/dashboard/program", "/dashboard/emergency", "/dashboard/moc",
      "/dashboard/import", "/dashboard/integrations", "/dashboard/privacy-requests",
      "/dashboard/context", "/dashboard/workflow-catalog",
    ]) {
      expect(flat.some((i) => i.href === href), `Field navigation hides ${href}`).toBe(false);
    }
  });

  it.each([
    { layout: "field" as const, isAdmin: true, canIntegrationRead: false, canAuditTrailRead: false },
    { layout: "field" as const, isAdmin: false, canIntegrationRead: true, canAuditTrailRead: false },
    { layout: "field" as const, isAdmin: false, canIntegrationRead: false, canAuditTrailRead: true },
    { layout: "desk" as const, isAdmin: false, canIntegrationRead: false, canAuditTrailRead: false },
  ])("preserves the existing management-navigation allowance for %o", (input) => {
    const filtered = navSectionsForUser(input);
    expect(filtered.some((s) => s.title === "Administration")).toBe(true);
    expect(filtered.flatMap((s) => s.items)).toHaveLength(33);
  });
});

describe("corporate EHS information architecture", () => {
  const byTitle = Object.fromEntries(DASHBOARD_NAV_SECTIONS.map((s) => [s.title, s]));
  function section(title: string) {
    const s = byTitle[title];
    if (!s) throw new Error(`Missing nav section: ${title}`);
    return s;
  }

  it("exposes six named work areas with Administration separate", () => {
    expect(DASHBOARD_NAV_SECTIONS.map((s) => s.title)).toEqual([
      "Overview", "Actions & approvals", "Incidents & observations",
      "Audits & inspections", "Programs & risks", "Reports & evidence", "Administration",
    ]);
    expect(DASHBOARD_NAV_SECTIONS.slice(0, 6).every((s) => s.cluster === "primary")).toBe(true);
    expect(section("Administration").cluster).toBe("secondary");
  });

  it("preserves every existing route exactly once", () => {
    const expectedRoutes = [
      "/dashboard", "/dashboard/tasks", "/dashboard/incidents", "/dashboard/observations",
      "/dashboard/inspections", "/dashboard/permits", "/dashboard/approvals", "/dashboard/capa",
      "/dashboard/audit-trail", "/dashboard/documents", "/dashboard/planning", "/dashboard/heat-program",
      "/dashboard/risk-assessments", "/dashboard/environment", "/dashboard/chemicals",
      "/dashboard/environmental-permits", "/dashboard/audits", "/dashboard/assurance",
      "/dashboard/management-review", "/dashboard/rag", "/dashboard/retention", "/dashboard/analytics",
      "/dashboard/analytics/incidence-rates", "/dashboard/training", "/dashboard/contractors",
      "/dashboard/program", "/dashboard/emergency", "/dashboard/moc", "/dashboard/import",
      "/dashboard/integrations", "/dashboard/privacy-requests", "/dashboard/context", "/dashboard/workflow-catalog",
    ];
    const actualRoutes = DASHBOARD_NAV_LINKS.map((item) => item.href);
    expect(actualRoutes).toHaveLength(33);
    expect(new Set(actualRoutes).size).toBe(33);
    expect([...actualRoutes].sort()).toEqual(expectedRoutes.sort());
  });

  it("keeps incident and action records discoverable within named corporate work areas", () => {
    const areaFor = (href: string) => DASHBOARD_NAV_SECTIONS.find((s) => s.items.some((i) => i.href === href))?.title;
    expect(areaFor("/dashboard/incidents")).toBe("Incidents & observations");
    expect(areaFor("/dashboard/inspections")).toBe("Audits & inspections");
    expect(areaFor("/dashboard/audits")).toBe("Audits & inspections");
    expect(areaFor("/dashboard/approvals")).toBe("Actions & approvals");
    expect(areaFor("/dashboard/capa")).toBe("Actions & approvals");
    expect(areaFor("/dashboard/tasks")).toBe("Actions & approvals");
    expect(areaFor("/dashboard/audit-trail")).toBe("Reports & evidence");
    for (const href of CORE_SPINE_HREFS) {
      expect(DASHBOARD_NAV_LINKS.filter((item) => item.href === href)).toHaveLength(1);
    }
  });

  it("puts reporting and its supporting evidence together", () => {
    const reportRoutes = section("Reports & evidence").items.map((item) => item.href);
    expect(reportRoutes).toEqual(expect.arrayContaining([
      "/dashboard/analytics", "/dashboard/analytics/incidence-rates", "/dashboard/audit-trail", "/dashboard/documents",
    ]));
    expect(section("Overview").items.map((item) => item.href)).toEqual(["/dashboard"]);
  });

  it("keeps work permits and environmental permits distinctly named", () => {
    expect(DASHBOARD_NAV_LINKS.find((item) => item.href === "/dashboard/permits")?.label).toMatch(/work permits.*PTW/i);
    expect(DASHBOARD_NAV_LINKS.find((item) => item.href === "/dashboard/environmental-permits")?.label).toMatch(/environmental permits/i);
    expect(DASHBOARD_NAV_LINKS.find((item) => item.href === "/dashboard/permits")?.label).not.toEqual(
      DASHBOARD_NAV_LINKS.find((item) => item.href === "/dashboard/environmental-permits")?.label,
    );
  });

  it("keeps scaffold-only import and privacy destinations under Administration", () => {
    expect(section("Administration").items.map((item) => item.href)).toEqual(expect.arrayContaining([
      "/dashboard/import", "/dashboard/privacy-requests",
    ]));
    // Chemical inventory remains a program destination, with its existing maturity banner
    // checked below. Changing its navigation group does not promote its workflow maturity.
    expect(section("Programs & risks").items.some((item) => item.href === "/dashboard/chemicals")).toBe(true);
  });

  it("expands the active work area and leaves unrelated areas closed", () => {
    expect(sectionShouldExpandByDefault(section("Actions & approvals"), "/dashboard/capa/example-id")).toBe(true);
    expect(sectionShouldExpandByDefault(section("Reports & evidence"), "/dashboard/capa/example-id")).toBe(false);
    expect(sectionContainsPath(section("Overview"), "/dashboard/capa/example-id")).toBe(false);
    expect(sectionContainsPath(section("Incidents & observations"), "/dashboard/incidents-archive")).toBe(false);
  });

  it.each([
    ["/dashboard", "/dashboard"],
    ["/dashboard/incidents/new", "/dashboard/incidents"],
    ["/dashboard/incidents/record-id", "/dashboard/incidents"],
    ["/dashboard/capa/record-id", "/dashboard/capa"],
    ["/dashboard/analytics/incidence-rates", "/dashboard/analytics/incidence-rates"],
    ["/dashboard/analytics/incidence-rates/snapshot", "/dashboard/analytics/incidence-rates"],
    ["/dashboard/analytics", "/dashboard/analytics"],
    ["/dashboard/incidents-archive", undefined],
    ["/dashboard/unknown", undefined],
    ["/", undefined],
  ] as const)("selects only the most specific destination for %s", (pathname, href) => {
    expect(dashboardDestinationForPath(pathname)?.href).toBe(href);
  });
});

describe("shell composition + tokens + honesty (ADR-UX-002)", () => {
  it("keeps sole Chrome → Shell → AuthenticatedLayout composition (AC-012)", () => {
    const layout = readSrc("src/app/dashboard/layout.tsx");
    const chrome = readSrc("src/components/dashboard-chrome.tsx");
    const shell = readSrc("src/components/dashboard-shell.tsx");
    const authed = readSrc("src/components/dashboard-authenticated-layout.tsx");

    expect(layout).toMatch(/from "@\/components\/dashboard-chrome"/);
    expect(layout).toMatch(/<DashboardChrome/);
    expect(layout).not.toMatch(/from "@\/components\/dashboard-shell"/);
    expect(layout).not.toMatch(/from "@\/components\/dashboard-authenticated-layout"/);
    expect(chrome).toMatch(/from "@\/components\/dashboard-shell"/);
    expect(chrome).toMatch(/<DashboardShell/);
    expect(chrome).not.toMatch(/from "@\/components\/dashboard-authenticated-layout"/);
    expect(shell).toMatch(/from "@\/components\/dashboard-authenticated-layout"/);
    expect(shell).toMatch(/<DashboardAuthenticatedLayout/);
    expect(authed).toMatch(/DashboardGroupedNav|DashboardSiteHeader/);

    const layoutFiles = readdirSync(join(repoRoot, "src/app/dashboard"), {
      withFileTypes: true,
    }).filter((d) => d.isFile() && d.name === "layout.tsx");
    expect(layoutFiles).toHaveLength(1);
  });

  it("centralizes tokens in globals.css and forbids mandatory UI kits (AC-013)", () => {
    const css = readSrc("src/app/globals.css");
    expect(css).toMatch(/@theme inline/);
    expect(css).toMatch(/--color-primary/);
    expect(css).toMatch(/\.btn-primary/);
    expect(css).toMatch(/\.btn-secondary/);

    const pkg = JSON.parse(readSrc("package.json")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    const forbidden = Object.keys(all).filter((k) =>
      /@mui\/|@chakra-ui\/|chakra-ui|@radix-ui\/react|shadcn/i.test(k),
    );
    expect(forbidden).toEqual([]);
    expect(pkg.dependencies.next).toMatch(/^16\./);
    expect(pkg.dependencies.react).toMatch(/^19\./);
    expect(pkg.devDependencies.tailwindcss).toMatch(/^\^?4/);
  });

  it("proves field Administration hide is server-permission backed (AC-014)", () => {
    const orgRouter = readSrc("src/server/trpc/routers/organization.ts");
    expect(orgRouter).toMatch(/dashboardHomeLayout/);
    expect(orgRouter).toMatch(/userHasPermission/);
    expect(orgRouter).not.toMatch(/isField\s*=\s*true/);

    const nav = readSrc("src/components/dashboard-grouped-nav.tsx");
    expect(nav).toMatch(/organization\.dashboardHomeLayout/);
    expect(nav).toMatch(/navSectionsForUser/);

    const fieldNoAdmin = navSectionsForUser({
      layout: "field",
      isAdmin: false,
      canIntegrationRead: false,
      canAuditTrailRead: false,
    });
    expect(fieldNoAdmin.some((s) => s.title === "Administration")).toBe(false);

    const fieldAdmin = navSectionsForUser({
      layout: "field",
      isAdmin: true,
      canIntegrationRead: false,
      canAuditTrailRead: false,
    });
    expect(fieldAdmin.some((s) => s.title === "Administration")).toBe(true);
  });

  it("keeps ≤1 filled primary CTA markers on stress templates (AC-004)", () => {
    const countBtnPrimary = (src: string) => (src.match(/btn-primary(?!-soft)/g) ?? []).length;

    const hero = readSrc("src/components/dashboard/dashboard-action-queue-hero.tsx");
    expect(hero).toMatch(/data-stress-action-region="today-queue-row"/);
    expect(countBtnPrimary(hero)).toBe(1);

    const field = readSrc("src/components/dashboard/dashboard-field-launcher.tsx");
    expect(field).toMatch(/btn-primary-soft/);
    expect(countBtnPrimary(field)).toBe(0);
    expect((field.match(/btn-primary-soft/g) ?? []).length).toBe(1);

    const incidentNew = readSrc("src/app/dashboard/incidents/new/page.tsx");
    expect(incidentNew).toMatch(/data-stress-action-region="capture-create"/);
    expect(countBtnPrimary(incidentNew)).toBe(1);
    expect(incidentNew).toMatch(/btn-secondary/);
    expect(incidentNew).toMatch(/Suggest wording \(AI\)/);
    expect(incidentNew).toMatch(/role="alert"/);

    const approvals = readSrc("src/app/dashboard/approvals/page.tsx");
    expect(approvals).toMatch(/data-stress-action-region="decide-approve-reject"/);
    expect(approvals).toMatch(/btn-secondary/);
    expect(approvals).toMatch(/Reject/);
  });

  it("keeps ModuleMaturityBanner role=note honesty invariant (AC-005)", () => {
    const banner = readSrc("src/components/dashboard/module-maturity-banner.tsx");
    expect(banner).toMatch(/role="note"/);
    expect(banner).toMatch(/plumbing/);
    expect(banner).toMatch(/connected/);

    // Banner=Yes routes from docs/module-maturity.md must mount the banner.
    for (const page of [
      "src/app/dashboard/chemicals/page.tsx",
      "src/app/dashboard/privacy-requests/page.tsx",
      "src/app/dashboard/heat-program/page.tsx",
      "src/app/dashboard/risk-assessments/page.tsx",
      "src/app/dashboard/import/page.tsx",
    ]) {
      expect(readSrc(page)).toMatch(/ModuleMaturityBanner/);
    }
  });

  it("preserves #dash-kpis smoke / cohesion anchors (AC-CF-D008)", () => {
    const desk = readSrc("src/components/dashboard/command-center-desk-view.tsx");
    expect(desk).toMatch(/id=["']dash-kpis["']/);
    expect(desk).toMatch(/data-section=["']kpis["']/);
    expect(desk).toMatch(/<details[\s\S]{0,240}id=["']dash-kpis["']/);
  });
});

