import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAttentionChips,
  filterAttentionChipsForActionQueue,
} from "@/lib/dashboard/commandCenterSignals";
import { filterDashboardNavSections, navSectionsForUser } from "@/lib/dashboard-nav-filter";
import { CORE_SPINE_HREFS, DASHBOARD_NAV_SECTIONS } from "@/lib/dashboard-nav-links";

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
    expect(filtered.some((s) => s.title === "Plan & programme")).toBe(true);
    const flat = filtered.flatMap((s) => s.items);
    expect(flat.some((i) => i.href === "/dashboard/heat-program")).toBe(true);
    expect(flat.some((i) => i.href === "/dashboard/chemicals")).toBe(true);
    expect(flat.length).toBeLessThanOrEqual(28);
  });

  it("keeps management system for org admins", () => {
    const filtered = navSectionsForUser({
      layout: "field",
      isAdmin: true,
      canIntegrationRead: false,
      canAuditTrailRead: false,
    });
    expect(filtered.some((s) => s.title === "Administration")).toBe(true);
  });
});

describe("task-first IA (ADR-UX-001)", () => {
  const byTitle = Object.fromEntries(DASHBOARD_NAV_SECTIONS.map((s) => [s.title, s]));

  it("exposes primary Today / Capture / Decide / Prove before secondary clusters", () => {
    const titles = DASHBOARD_NAV_SECTIONS.map((s) => s.title);
    expect(titles.slice(0, 4)).toEqual(["Today", "Capture", "Decide", "Prove"]);
    expect(DASHBOARD_NAV_SECTIONS.slice(0, 4).every((s) => s.cluster === "primary")).toBe(true);
    expect(DASHBOARD_NAV_SECTIONS.slice(4).every((s) => s.cluster === "secondary")).toBe(true);
  });

  it("maps Core spine hrefs into exactly one primary mode each", () => {
    const modeFor = (href: string): string | undefined => {
      for (const section of DASHBOARD_NAV_SECTIONS) {
        if (section.items.some((i) => i.href === href)) return section.title;
      }
      return undefined;
    };
    expect(modeFor("/dashboard/incidents")).toBe("Capture");
    expect(modeFor("/dashboard/inspections")).toBe("Capture");
    expect(modeFor("/dashboard/approvals")).toBe("Decide");
    expect(modeFor("/dashboard/capa")).toBe("Decide");
    expect(modeFor("/dashboard/audit-trail")).toBe("Prove");
    for (const href of CORE_SPINE_HREFS) {
      expect(modeFor(href)).toBeTruthy();
      const section = DASHBOARD_NAV_SECTIONS.find((s) => s.items.some((i) => i.href === href));
      expect(section?.cluster).toBe("primary");
    }
  });

  it("keeps Today personal-work only (approvals under Decide)", () => {
    const todayHrefs = byTitle.Today.items.map((i) => i.href);
    expect(todayHrefs).toEqual(["/dashboard", "/dashboard/tasks"]);
    expect(todayHrefs).not.toContain("/dashboard/approvals");
  });

  it("places CAPA under Decide and Prove as audit/evidence-only", () => {
    expect(byTitle.Decide.items.map((i) => i.href)).toEqual([
      "/dashboard/approvals",
      "/dashboard/capa",
    ]);
    const proveHrefs = byTitle.Prove.items.map((i) => i.href);
    expect(proveHrefs).toContain("/dashboard/audit-trail");
    expect(proveHrefs).toContain("/dashboard/documents");
    expect(proveHrefs).not.toContain("/dashboard/analytics");
    expect(proveHrefs).not.toContain("/dashboard/analytics/incidence-rates");
  });

  it("keeps PTW under Capture and env permits copy-separated in secondary programme", () => {
    expect(byTitle.Capture.items.map((i) => i.href)).toContain("/dashboard/permits");
    expect(byTitle.Capture.items.map((i) => i.href)).not.toContain(
      "/dashboard/environmental-permits",
    );
    expect(byTitle["Plan & programme"].items.map((i) => i.href)).toContain(
      "/dashboard/environmental-permits",
    );
  });

  it("does not promote Plumbing into primary chrome", () => {
    const primaryHrefs = DASHBOARD_NAV_SECTIONS.filter((s) => s.cluster === "primary").flatMap(
      (s) => s.items.map((i) => i.href),
    );
    expect(primaryHrefs).not.toContain("/dashboard/chemicals");
    expect(primaryHrefs).not.toContain("/dashboard/import");
    expect(primaryHrefs).not.toContain("/dashboard/privacy-requests");
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

