/**
 * UI / API reference for US injury & illness recordkeeping — not legal advice.
 * Counsel must confirm which rule set applies (federal 29 CFR Part 1904 vs OSHA-approved
 * State Plan vs additional state statutes) for each establishment and sector.
 */

export const OSHA_STATE_PLANS_URL = "https://www.osha.gov/stateplans";

export type UsStateOption = { code: string; name: string };

/** US states + DC for establishment / record jurisdiction pickers. */
export const US_STATE_OPTIONS: UsStateOption[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

/**
 * Jurisdictions commonly discussed as having OSHA-approved State Plans.
 * Private vs public sector coverage, reporting gates, and electronic submission rules differ —
 * always verify on OSHA’s State Plans page and the state program’s site.
 */
export const STATE_PLAN_HIGHLIGHTS: {
  code: string;
  programLabel: string;
  note: string;
}[] = [
  { code: "AK", programLabel: "Alaska", note: "Verify sector coverage vs federal OSHA." },
  { code: "AZ", programLabel: "Arizona", note: "ADOSH — confirm reporting thresholds vs 1904." },
  { code: "CA", programLabel: "California", note: "Cal/OSHA Title 8; definitions can differ from 1904." },
  { code: "HI", programLabel: "Hawaii", note: "HIOSH — check supplementary state posting/reporting." },
  { code: "IN", programLabel: "Indiana", note: "IOSHA — confirm applicability to your sector." },
  { code: "IA", programLabel: "Iowa", note: "Iowa OSHA — verify coverage." },
  { code: "KY", programLabel: "Kentucky", note: "Kentucky OSH Program — dual-check classification." },
  { code: "MD", programLabel: "Maryland", note: "MOSH — confirm reporting timelines." },
  { code: "MI", programLabel: "Michigan", note: "MIOSHA — sector coverage nuances." },
  { code: "MN", programLabel: "Minnesota", note: "MNOSHA — compare to 1904 recordability tests." },
  { code: "NV", programLabel: "Nevada", note: "SCATS — confirm injury/illness log rules." },
  { code: "NC", programLabel: "North Carolina", note: "NC DOL OSH — verify electronic submittals if any." },
  { code: "OR", programLabel: "Oregon", note: "Oregon OSHA — can differ on definitions/hours." },
  { code: "SC", programLabel: "South Carolina", note: "SC OSHA — confirm applicability." },
  { code: "TN", programLabel: "Tennessee", note: "TOSHA — verify thresholds." },
  { code: "UT", programLabel: "Utah", note: "UOSH — confirm sector." },
  { code: "VT", programLabel: "Vermont", note: "VOSHA — small employer nuances may apply." },
  { code: "VA", programLabel: "Virginia", note: "VOSH — verify classifications." },
  { code: "WA", programLabel: "Washington", note: "DOSH / WISHA — SAR / state forms may apply." },
  { code: "WY", programLabel: "Wyoming", note: "Wyoming OSHA — confirm coverage." },
  { code: "PR", programLabel: "Puerto Rico", note: "Territorial program — confirm rule set." },
];

export const RECORDKEEPING_REFERENCE_DISCLAIMER =
  "This application does not provide legal determinations. Multi-state employers may face different thresholds, definitions, and reporting channels. Confirm with qualified counsel and the authoritative OSHA State Plans directory before relying on classifications for compliance.";

export function getRecordkeepingReferencePayload() {
  return {
    disclaimer: RECORDKEEPING_REFERENCE_DISCLAIMER,
    statePlansUrl: OSHA_STATE_PLANS_URL,
    federalSummary: [
      "29 CFR Part 1904 is the default federal injury & illness recordkeeping rule for covered employers.",
      "When OSHA approves a State Plan, the state may enforce requirements that are at least as effective as federal rules; some definitions, reporting triggers, or industry exemptions can differ.",
      "Certain states add workers’ compensation only or public-sector-only schemes—capture those under “state statute supplement” with a citation in “state rule reference”.",
    ],
    usStates: US_STATE_OPTIONS,
    statePlanHighlights: STATE_PLAN_HIGHLIGHTS,
  };
}
