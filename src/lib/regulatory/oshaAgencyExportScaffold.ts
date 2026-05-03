/**
 * Scaffold for jurisdiction-specific OSHA **agency-formatted** exports (e.g. Form 300-style layouts).
 * Not legal advice. Not filing-ready. Use for engineering shape only until counsel + EHS sign off.
 */
export type OshaAgencyExportStatus = "not_implemented";

export type OshaAgencyExportPlaceholder = {
  status: OshaAgencyExportStatus;
  disclaimer: string;
  /** Column headers a future CSV/XML exporter might emit after counsel review */
  referenceColumns: string[];
};

const DISCLAIMER =
  "This application does not produce OSHA-, state-plan-, or other agency-formatted filings. " +
  "The JSON injury/illness snapshot is a separate, audited extract for internal review. " +
  "Consult qualified counsel and safety professionals before any regulatory submission.";

export const REFERENCE_COLUMNS_300_STYLE = [
  "case_id",
  "establishment",
  "employee_name_privacy",
  "job_title",
  "date_of_injury_or_illness",
  "description",
  "classification",
  "days_away",
  "days_restricted",
  "privacy_case",
] as const;

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Header + one synthetic example row for internal layout review only — not OSHA filing output.
 */
export function buildOshaAgencyReferenceCsvSample(): string {
  const header = REFERENCE_COLUMNS_300_STYLE.map(escapeCsvField).join(",");
  const example = [
    "example-case-000",
    "Example Plant — Building 1",
    "withheld",
    "Example job title",
    "2026-01-01",
    "Example injury or illness description (synthetic)",
    "other_recordable",
    "0",
    "0",
    "false",
  ]
    .map(escapeCsvField)
    .join(",");
  return `${header}\n${example}\n`;
}

export function buildAgencyExportPlaceholder(): OshaAgencyExportPlaceholder {
  return {
    status: "not_implemented",
    disclaimer: DISCLAIMER,
    referenceColumns: [...REFERENCE_COLUMNS_300_STYLE],
  };
}
