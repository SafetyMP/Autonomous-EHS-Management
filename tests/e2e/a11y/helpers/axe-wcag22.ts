import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** axe-core tags covering WCAG 2.2 AA (includes 2.0/2.1 AA baseline rules). */
export const WCAG_22_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;

function formatViolations(
  violations: { id: string; impact?: string | null; help: string; nodes: { target: unknown[] }[] }[],
): string {
  if (!violations.length) return "(none)";
  return violations
    .map((v) => {
      const targets = v.nodes
        .slice(0, 5)
        .map((n) => JSON.stringify(n.target))
        .join("; ");
      return `[${v.impact ?? "unknown"}] ${v.id}: ${v.help} → ${targets}`;
    })
    .join("\n");
}

/**
 * Run axe with WCAG 2.2 AA tags. Serious + critical impacts fail the test (AC-007 / AC-020).
 * Does not claim WCAG 3 conformance (AC-008).
 */
export async function expectNoSeriousCriticalAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags([...WCAG_22_AA_TAGS]).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(blocking, `axe serious/critical violations:\n${formatViolations(blocking)}`).toEqual([]);
}
