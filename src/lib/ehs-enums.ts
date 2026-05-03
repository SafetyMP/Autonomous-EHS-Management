/** Client-safe mirrors of DB enums (keep aligned with Drizzle `pgEnum` values). */
export const INCIDENT_SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const INCIDENT_TYPES = [
  "injury",
  "ill_health",
  "near_miss",
  "environmental",
  "property_damage",
  "other",
] as const;

export const ASPECT_SIGNIFICANCES = ["low", "medium", "high"] as const;
