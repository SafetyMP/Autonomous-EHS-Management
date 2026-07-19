import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../../..");

function readSrc(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function countBtnPrimary(src: string): number {
  return (src.match(/btn-primary(?!-soft)/g) ?? []).length;
}

function indexOfOrThrow(src: string, needle: string, label: string): number {
  const i = src.indexOf(needle);
  expect(i >= 0, `${label} must appear in source`).toBe(true);
  return i;
}

describe("Today density ceilings (AC-CF-D001, AC-CF-D003)", () => {
  const desk = readSrc("src/components/dashboard/command-center-desk-view.tsx");
  const hero = readSrc("src/components/dashboard/dashboard-action-queue-hero.tsx");
  const header = readSrc("src/components/dashboard/dashboard-page-header.tsx");

  it("keeps ≤1 H1 via DashboardPageHeader and no extra h1 in desk view", () => {
    expect(header).toMatch(/<h1\b/);
    expect((header.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(desk).not.toMatch(/<h1\b/);
    expect(desk).toMatch(/DashboardPageHeader/);
  });

  it("keeps ≤1 filled primary CTA in the Today action queue strip", () => {
    expect(hero).toMatch(/data-stress-action-region="today-queue-row"/);
    expect(countBtnPrimary(hero)).toBe(1);
    expect(countBtnPrimary(desk)).toBe(0);
  });

  it("caps emphasized queue rows at 3 before View all", () => {
    expect(hero).toMatch(/MAX_EMPHASIZED_QUEUE_ROWS\s*=\s*3/);
    expect(hero).toMatch(/data-emphasized-queue-row/);
    expect(hero).toMatch(/View all/);
  });

  it("exposes ≤1 persistent status region marker on Today desk", () => {
    const markers = desk.match(/data-status-region=/g) ?? [];
    expect(markers.length).toBeLessThanOrEqual(1);
  });

  it("does not render KPI tiles outside closed details for any desk persona", () => {
    expect(desk).toMatch(/id=["']dash-kpis["']/);
    expect(desk).toMatch(/data-section=["']kpis["']/);
    expect(desk).toMatch(/<details[\s\S]*id=["']dash-kpis["']/);
    // No open-by-default persona branch (supervisor must also start closed).
    expect(desk).not.toMatch(/collapsed=\{!showFullKpis\}/);
    expect(desk).not.toMatch(/showFullKpis/);
    expect(desk).toMatch(/useState\(false\)/);
    expect(desk).toMatch(/readKpiDisclosurePreference/);
  });
});

describe("KPI progressive disclosure + RR-CF-006 (AC-CF-D004, AC-CF-D008)", () => {
  const tile = readSrc("src/components/dashboard/dashboard-kpi-tile.tsx");
  const desk = readSrc("src/components/dashboard/command-center-desk-view.tsx");
  const pref = readSrc("src/components/dashboard/kpi-disclosure-preference.ts");

  it("adds data-kpi-tile on DashboardKpiTile root (RR-CF-006 / G-CF-RR-006)", () => {
    expect(tile).toMatch(/data-kpi-tile/);
    expect(tile).toMatch(/return \(\s*<Link[\s\S]*data-kpi-tile/);
  });

  it("places id and data-section on the KPI details element", () => {
    expect(desk).toMatch(
      /<details[\s\S]{0,200}id=["']dash-kpis["'][\s\S]{0,200}data-section=["']kpis["']/,
    );
  });

  it("encodes UR-CF-010 localStorage preference + closed first-visit default", () => {
    expect(pref).toMatch(/ehs-dashboard-kpi-disclosure/);
    expect(pref).toMatch(/readKpiDisclosurePreference/);
    expect(pref).toMatch(/writeKpiDisclosurePreference/);
    expect(pref).toMatch(/defaultKpiOpenForBreakpoint/);
    expect(pref).toMatch(/return false/);
  });
});

describe("CommandCenterDeskView slot order (AC-CF-D007)", () => {
  const desk = readSrc("src/components/dashboard/command-center-desk-view.tsx");

  it("orders action queue → KPIs → onboarding → program updates → activity in DOM source", () => {
    // Measure JSX call sites inside CommandCenterDeskView return (not helper defs / imports).
    const renderStart = desk.indexOf("export function CommandCenterDeskView");
    expect(renderStart).toBeGreaterThanOrEqual(0);
    const returnStart = desk.indexOf("return (", renderStart);
    expect(returnStart).toBeGreaterThan(renderStart);
    const body = desk.slice(returnStart);

    const queue = indexOfOrThrow(body, "<DashboardActionQueueHero", "action queue");
    const kpis = indexOfOrThrow(body, "<KpiSection", "KPIs");
    const onboarding = indexOfOrThrow(body, 'data-section="onboarding"', "onboarding");
    const program = indexOfOrThrow(body, "<DashboardProgramUpdates", "program updates");
    const activity = indexOfOrThrow(body, "<DashboardActivityFeed", "activity");

    expect(queue).toBeLessThan(kpis);
    expect(kpis).toBeLessThan(onboarding);
    expect(onboarding).toBeLessThan(program);
    expect(program).toBeLessThan(activity);
  });
});

describe("Field launcher density (AC-CF-D009)", () => {
  const field = readSrc("src/components/dashboard/dashboard-field-launcher.tsx");

  it("forbids KPI / activity / management panel imports", () => {
    expect(field).not.toMatch(/DashboardKpiTile/);
    expect(field).not.toMatch(/DashboardActivityFeed/);
    expect(field).not.toMatch(/DashboardProgramUpdates/);
    expect(field).not.toMatch(/PortCoPilotProofPanel/);
    expect(field).not.toMatch(/ModuleMaturityBanner/);
  });

  it("keeps ≤1 btn-primary-soft lead and Capture CTAs + pending strip only", () => {
    expect((field.match(/btn-primary-soft/g) ?? []).length).toBe(1);
    expect(countBtnPrimary(field)).toBe(0);
    expect(field).toMatch(/DashboardActionQueueFieldStrip/);
    expect(field).toMatch(/Start here/);
    expect(field).not.toMatch(/Recent lists/);
  });
});

describe("Capture / Decide stress CTA honesty (AC-CF-D002, AC-CF-D006)", () => {
  it("Capture incident: ≤1 primary submit; AI Suggest secondary", () => {
    const incidentNew = readSrc("src/app/dashboard/incidents/new/page.tsx");
    expect(incidentNew).toMatch(/data-stress-action-region="capture-create"/);
    expect(countBtnPrimary(incidentNew)).toBe(1);
    expect(incidentNew).toMatch(/Suggest wording \(AI\)/);
    const suggestIdx = incidentNew.indexOf("Suggest wording (AI)");
    const suggestBlock = incidentNew.slice(Math.max(0, suggestIdx - 400), suggestIdx);
    expect(suggestBlock).toMatch(/btn-secondary/);
    expect(suggestBlock).not.toMatch(/btn-primary(?!-soft)/);
  });

  it("Capture observation / inspection / permit: AI Suggest never primary", () => {
    for (const page of [
      "src/app/dashboard/observations/new/page.tsx",
      "src/app/dashboard/inspections/new/page.tsx",
      "src/app/dashboard/permits/new/page.tsx",
    ]) {
      const src = readSrc(page);
      expect(src).toMatch(/Suggest wording \(AI\)/);
      const suggestIdx = src.indexOf("Suggest wording (AI)");
      const suggestBlock = src.slice(Math.max(0, suggestIdx - 400), suggestIdx);
      expect(suggestBlock).not.toMatch(/btn-primary(?!-soft)/);
      expect(suggestBlock).toMatch(/btn-secondary|dfSecondaryOutline/);
    }
  });

  it("Decide approvals: Approve/Review primary; Reject secondary", () => {
    const approvals = readSrc("src/app/dashboard/approvals/page.tsx");
    expect(approvals).toMatch(/data-stress-action-region="decide-approve-reject"/);
    expect(approvals).toMatch(/btn-primary/);
    expect(approvals).toMatch(/btn-secondary/);
    expect(approvals).toMatch(/Reject/);
    const regionIdx = approvals.indexOf('data-stress-action-region="decide-approve-reject"');
    const regionEnd = approvals.indexOf("</div>", approvals.indexOf("btn-secondary", regionIdx));
    const region = approvals.slice(regionIdx, regionEnd > regionIdx ? regionEnd + 6 : regionIdx + 4000);
    expect(countBtnPrimary(region)).toBe(1);
    expect(region).toMatch(/btn-secondary/);
    expect(region).toMatch(/Reject/);
  });
});

describe("Attention + activity disclosure ceilings (AC-CF-D001)", () => {
  const desk = readSrc("src/components/dashboard/command-center-desk-view.tsx");

  it("limits attention chips to 5 initially with Show N more", () => {
    expect(desk).toMatch(/ATTENTION_INITIAL\s*=\s*5/);
    expect(desk).toMatch(/Show \{hiddenAttentionCount\} more/);
  });

  it("limits activity feed to 5 initially with load-more", () => {
    expect(desk).toMatch(/ACTIVITY_INITIAL\s*=\s*5/);
    expect(desk).toMatch(/Load more activity/);
  });
});
