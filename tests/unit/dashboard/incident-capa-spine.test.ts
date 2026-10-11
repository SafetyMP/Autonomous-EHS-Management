import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  incidentCapaSpineHoursRule,
  spineFactsFromSavedTrir,
} from "@/lib/dashboard/incidentCapaSpine";

const repoRoot = join(import.meta.dirname, "../../..");

function readSrc(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("incident CAPA spine", () => {
  it("locks the three home links and the partial-year hours sentence", () => {
    const spine = readSrc("src/components/dashboard/incident-capa-spine.tsx");
    expect(spine).toContain('href: "/dashboard/incidents/new"');
    expect(spine).toContain("Record an incident");
    expect(spine).toContain('href: "/dashboard/capa"');
    expect(spine).toContain("Link a CAPA");
    expect(spine).toContain('href: "/dashboard/analytics/incidence-rates"');
    expect(spine).toContain("Read TRIR");
    expect(spine).toContain("{incidentCapaSpineHoursRule()}");

    const sentence = incidentCapaSpineHoursRule();
    expect(sentence).toBe(
      "A complete 12-month grid is the denominator; a partial month grid does not replace the annual total; with neither, the rate is not computed.",
    );
    expect(sentence).toMatch(/partial month grid does not replace the annual total/);
  });

  it("renders the spine above both dashboard homes", () => {
    const page = readSrc("src/app/dashboard/page.tsx");
    const field = page.indexOf("<DashboardFieldLauncher");
    const desk = page.indexOf("<CommandCenterDeskView");
    const spines = [...page.matchAll(/<IncidentCapaSpine/g)].map((match) => match.index ?? -1);
    expect(field).toBeGreaterThan(-1);
    expect(desk).toBeGreaterThan(-1);
    expect(spines).toHaveLength(2);
    expect(spines[0]!).toBeGreaterThan(-1);
    expect(spines[0]!).toBeLessThan(field);
    expect(spines[1]!).toBeLessThan(desk);
    expect(spines[0]!).toBeLessThan(spines[1]!);
  });

  it("reads a saved snapshot without recomputing the rate", () => {
    const annual = spineFactsFromSavedTrir({
      resultJson: { trir: 1.5, hoursSource: "annual_year_metrics" },
      inputsJson: {
        hoursSource: "annual_year_metrics",
        partialMonthlyCoverageWarning: true,
      },
    });
    expect(annual.rate).toBe("Latest saved TRIR is 1.50.");
    expect(annual.hoursSource).toBe("Hours came from the annual total.");
    expect(annual.partialCoverage).toMatch(/did not replace the annual total/);

    const monthly = spineFactsFromSavedTrir({
      resultJson: { trir: null, hoursSource: "monthly_roll_up" },
      inputsJson: { hoursSource: "monthly_roll_up", partialMonthlyCoverageWarning: false },
    });
    expect(monthly.rate).toBe("Latest saved TRIR was not computed.");
    expect(monthly.hoursSource).toBe("Hours came from a complete 12-month grid.");
    expect(monthly.partialCoverage).toBe("No partial-coverage warning on the latest snapshot.");

    const mixed = spineFactsFromSavedTrir({
      resultJson: { trir: 0 },
      inputsJson: { hoursSource: "mixed" },
    });
    expect(mixed.rate).toBe("Latest saved TRIR is 0.00.");
    expect(mixed.hoursSource).toMatch(/complete month grid/);
  });
});
