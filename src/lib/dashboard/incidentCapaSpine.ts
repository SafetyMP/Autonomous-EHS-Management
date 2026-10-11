/**
 * Copy for the dashboard incident → CAPA → TRIR spine.
 * Hours wording matches the README: a complete 12-month grid is the denominator.
 */

const TRIR_HOURS_SOURCES = ["monthly_roll_up", "annual_year_metrics", "mixed"] as const;

type TrirHoursSourceLabel = (typeof TRIR_HOURS_SOURCES)[number];

export function incidentCapaSpineHoursRule(): string {
  return "A complete 12-month grid is the denominator; a partial month grid does not replace the annual total; with neither, the rate is not computed.";
}

export type SavedTrirSnapshotJson = {
  resultJson: Record<string, unknown>;
  inputsJson: Record<string, unknown>;
};

export type SpineTrirFacts = {
  rate: string;
  hoursSource: string;
  partialCoverage: string;
};

function isTrirHoursSource(value: string): value is TrirHoursSourceLabel {
  return (TRIR_HOURS_SOURCES as readonly string[]).includes(value);
}

function hoursSourceSentence(source: string): string {
  if (!isTrirHoursSource(source)) {
    return `Hours source on the latest snapshot: ${source}.`;
  }
  switch (source) {
    case "monthly_roll_up":
      return "Hours came from a complete 12-month grid.";
    case "annual_year_metrics":
      return "Hours came from the annual total.";
    case "mixed":
      return "Hours came from a complete month grid for some establishments and the annual total for others.";
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

/** Plain-language reading of a saved snapshot. Does not recompute TRIR. */
export function spineFactsFromSavedTrir(row: SavedTrirSnapshotJson): SpineTrirFacts {
  const trir = row.resultJson.trir;
  const rate =
    typeof trir === "number" && Number.isFinite(trir)
      ? `Latest saved TRIR is ${trir.toFixed(2)}.`
      : "Latest saved TRIR was not computed.";

  const rawSource = row.inputsJson.hoursSource ?? row.resultJson.hoursSource;
  const hoursSource =
    typeof rawSource === "string"
      ? hoursSourceSentence(rawSource)
      : "Hours source is not recorded on the latest snapshot.";

  const partial =
    row.inputsJson.partialMonthlyCoverageWarning === true ||
    row.resultJson.partialMonthlyCoverageWarning === true;

  const partialCoverage = partial
    ? "Partial month coverage: a partial month grid did not replace the annual total."
    : "No partial-coverage warning on the latest snapshot.";

  return { rate, hoursSource, partialCoverage };
}
