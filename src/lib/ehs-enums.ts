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
  "safety_observation_program",
  "work_permit_program",
  "environmental_regulatory_permit_program",
  "risk_assessment_program",
] as const;

export const DATA_RETENTION_ACTIONS = ["hold", "anonymize", "delete"] as const;

export const RETENTION_DATE_ANCHORS = ["rolling_from_event", "calendar_year_end"] as const;

/** Mirrors `risk_assessment_kind` in schema. */
export const RISK_ASSESSMENT_KINDS = ["general", "task_based", "site_based"] as const;

/** Mirrors `risk_assessment_status` in schema. */
export const RISK_ASSESSMENT_STATUSES = [
  "draft",
  "active",
  "under_review",
  "archived",
] as const;

/** Mirrors `risk_rating` in schema. */
export const RISK_RATINGS = ["low", "medium", "high", "very_high"] as const;

/** Mirrors `environmental_regulatory_permit_media` in schema. */
export const ENVIRONMENTAL_REGULATORY_PERMIT_MEDIA = [
  "air",
  "water",
  "waste",
  "general",
] as const;

/** Mirrors `environmental_regulatory_permit_status` in schema. */
export const ENVIRONMENTAL_REGULATORY_PERMIT_STATUS = [
  "draft",
  "pending_approval",
  "active",
  "suspended",
  "expired",
  "closed",
] as const;
