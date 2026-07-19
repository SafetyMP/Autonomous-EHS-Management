import type { Page } from "@playwright/test";

/**
 * ADR-UX-006 §7 interactive control measurement (AC-CF-D005).
 *
 * Method: Playwright `page.evaluate` over `#main-content` (Today desk surface),
 * using the acceptance selector. Not CDP Protocol Input.* — DOM query + computed
 * style filters. Excludes `display:none` / `visibility:hidden`, `[hidden]`,
 * `aria-hidden="true"`, and nodes inside **closed** `<details>` (summary of a
 * closed details remains counted).
 *
 * Scope: `#main-content` only — nav rail, session strip, and What's new banner
 * sit outside that landmark (DashboardWorkspace). Otherwise ≤12 is unreachable.
 */
export const INTERACTIVE_CONTROL_SELECTOR = [
  'a[href]:not([aria-hidden="true"]):not([hidden])',
  'button:not([aria-hidden="true"]):not([hidden])',
  'details > summary:not([aria-hidden="true"])',
  'input:not([hidden]):not([type="hidden"])',
  'select:not([hidden])',
].join(", ");

export const KPI_DISCLOSURE_STORAGE_KEY = "ehs-dashboard-kpi-disclosure";

/** Clear KPI preference (+ all local/session storage) for UR-CF-010 first-visit baseline. */
export async function clearClientStorageForFirstVisit(page: Page): Promise<void> {
  await page.evaluate((kpiKey) => {
    try {
      localStorage.removeItem(kpiKey);
      localStorage.clear();
    } catch {
      /* private mode */
    }
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  }, KPI_DISCLOSURE_STORAGE_KEY);
}

export async function countInteractiveControlsInMain(page: Page): Promise<number> {
  return page.evaluate((selector) => {
    const root = document.querySelector("#main-content");
    if (!root) return -1;

    const candidates = Array.from(root.querySelectorAll(selector));

    function isInsideClosedDetails(el: Element): boolean {
      let node: Element | null = el.parentElement;
      while (node) {
        if (node.tagName === "DETAILS") {
          const details = node as HTMLDetailsElement;
          if (!details.open) {
            // Summary of this closed details is still an interactive control.
            if (el.tagName === "SUMMARY" && el.parentElement === details) {
              return false;
            }
            return true;
          }
        }
        node = node.parentElement;
      }
      return false;
    }

    function isComputedHidden(el: Element): boolean {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return true;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return true;
      return false;
    }

    function hasAriaHiddenAncestor(el: Element): boolean {
      let node: Element | null = el;
      while (node) {
        if (node.getAttribute("aria-hidden") === "true") return true;
        node = node.parentElement;
      }
      return false;
    }

    return candidates.filter((el) => {
      if (isInsideClosedDetails(el)) return false;
      if (isComputedHidden(el)) return false;
      if (hasAriaHiddenAncestor(el)) return false;
      return true;
    }).length;
  }, INTERACTIVE_CONTROL_SELECTOR);
}

/** Visible `[data-kpi-tile]` count (closed KPI details → 0). */
export async function countVisibleKpiTiles(page: Page): Promise<number> {
  return page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll("[data-kpi-tile]"));
    return tiles.filter((el) => {
      let node: Element | null = el;
      while (node) {
        if (node.tagName === "DETAILS" && !(node as HTMLDetailsElement).open) {
          return false;
        }
        node = node.parentElement;
      }
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).length;
  });
}
