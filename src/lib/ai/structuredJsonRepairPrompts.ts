/**
 * Shared second-pass system prompts when LLM JSON fails Zod validation.
 * Keeps repair wording aligned across assistant procedures — reuse for any new structured JSON endpoints.
 */
export const ASSISTANT_TOOL_STEP_JSON_REPAIR_SYSTEM =
  'Return ONLY valid JSON. Shape must be exactly one of: {"step":"rag_search","query":"..."} or {"step":"final","summary":"...","citedChunkIds":["uuid"]}. citedChunkIds optional. No markdown fences or prose.';

export const OBSERVATION_INTAKE_JSON_REPAIR_SYSTEM =
  'Return ONLY valid JSON matching {"suggestedSummary":"string","suggestedDetails":"string?","citedChunkIds":["uuid"]?}. No markdown.';

export const INCIDENT_INTAKE_JSON_REPAIR_SYSTEM =
  'Return ONLY valid JSON matching {"suggestedTitle":"string","suggestedDescription":"string","suggestedImmediateActions":"string?","suggestedSeverity":"low"|"medium"|"high"|"critical"?,"suggestedIncidentType":"injury"|"ill_health"|"near_miss"|"environmental"|"property_damage"|"other"?,"citedChunkIds":["uuid"]?}. No markdown.';

export const INSPECTION_INTAKE_JSON_REPAIR_SYSTEM =
  'Return ONLY valid JSON matching {"suggestedTitle":"string","suggestedNotes":"string?","suggestedInspectionType":"routine"|"regulatory"|"pre_job"|"other"?,"citedChunkIds":["uuid"]?}. No markdown.';

export const PERMIT_INTAKE_JSON_REPAIR_SYSTEM =
  'Return ONLY valid JSON matching {"suggestedTitle":"string","suggestedWorkSummary":"string","suggestedHazardsControls":"string?","suggestedPermitType":"hot_work"|"confined_space"|"work_at_height"|"other"?,"citedChunkIds":["uuid"]?}. No markdown.';

export const CAPA_INTAKE_JSON_REPAIR_SYSTEM =
  'Return ONLY valid JSON matching {"suggestedTitle":"string","suggestedDetails":"string (at least 20 chars)","citedChunkIds":["uuid"]?}. No markdown.';
