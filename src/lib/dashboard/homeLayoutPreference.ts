const STORAGE_KEY = "ehs-dashboard-home-preference";

export type DashboardHomePreference = "auto" | "field" | "desk";

export function readDashboardHomePreference(): DashboardHomePreference {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "field" || raw === "desk" || raw === "auto") return raw;
  } catch {
    /* ignore */
  }
  return "auto";
}

export function writeDashboardHomePreference(value: DashboardHomePreference): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}
