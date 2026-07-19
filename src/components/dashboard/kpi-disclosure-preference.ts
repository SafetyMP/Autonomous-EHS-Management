/** UR-CF-010 — KPI `<details>` open preference (localStorage + first-visit closed). */
const STORAGE_KEY = "ehs-dashboard-kpi-disclosure";

export type KpiDisclosurePreference = "open" | "closed";

export function readKpiDisclosurePreference(): KpiDisclosurePreference | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "open" || raw === "closed") return raw;
  } catch {
    /* ignore quota / private mode */
  }
  return null;
}

export function writeKpiDisclosurePreference(value: KpiDisclosurePreference): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

/**
 * Breakpoint default when preference is unset: collapsed below `lg`.
 * First paint / cleared storage always stay closed (density gates).
 */
export function defaultKpiOpenForBreakpoint(viewportWidth: number): boolean {
  void viewportWidth;
  return false;
}
