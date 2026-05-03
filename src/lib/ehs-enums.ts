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

/** Mirrors `data_retention_*` enums in schema (client-safe). */
export const DATA_RETENTION_RECORD_CLASSES = [
  "incident_general",
  "osha_record",
  "gdpr_personal_data",
  "controlled_document",
] as const;

export const DATA_RETENTION_ACTIONS = ["hold", "anonymize", "delete"] as const;

export const RETENTION_DATE_ANCHORS = ["rolling_from_event", "calendar_year_end"] as const;
