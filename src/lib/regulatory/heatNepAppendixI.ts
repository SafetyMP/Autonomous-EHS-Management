/**
 * Versioned Heat NEP Appendix I–aligned checklist keys (CPL 03-00-024).
 * Program aid only — not a federal heat standard determination.
 */
export const HEAT_NEP_CHECKLIST_VERSION = "2026-04-cpl-03-00-024" as const;

export const HEAT_NEP_CHECK_KEYS = [
  "written_heat_program",
  "heat_monitoring",
  "cool_water_access",
  "shade_or_cool_rest",
  "scheduled_rest_breaks",
  "acclimatization",
  "administrative_controls",
  "worker_training",
  "supervisor_training",
  "emergency_response",
  "employee_understanding",
] as const;

export type HeatNepCheckKey = (typeof HEAT_NEP_CHECK_KEYS)[number];

export const HEAT_NEP_CHECK_LABELS: Record<HeatNepCheckKey, string> = {
  written_heat_program: "Written heat illness prevention program",
  heat_monitoring: "Monitoring of heat conditions / work exertion",
  cool_water_access: "Cool potable drinking water accessible near work",
  shade_or_cool_rest: "Shade or cool rest / recovery areas",
  scheduled_rest_breaks: "Scheduled rest breaks under heat conditions",
  acclimatization: "Acclimatization for new or returning workers",
  administrative_controls: "Administrative controls (pacing, rotation, PPE review)",
  worker_training: "Worker training on heat illness recognition and response",
  supervisor_training: "Supervisor training on the heat program",
  emergency_response: "Emergency response procedures for heat illness",
  employee_understanding: "Employees and supervisors understand the heat program",
};

export const HEAT_PROGRAM_CHECK_STATUSES = [
  "not_started",
  "in_place",
  "partial",
  "gap",
  "not_applicable",
] as const;

export type HeatProgramCheckStatus = (typeof HEAT_PROGRAM_CHECK_STATUSES)[number];

export function isHeatNepCheckKey(value: string): value is HeatNepCheckKey {
  return (HEAT_NEP_CHECK_KEYS as readonly string[]).includes(value);
}
