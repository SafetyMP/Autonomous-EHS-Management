/** CSV export for supervisory leading indicators (`analytics.leadingIndicators`). */

export type LeadingIndicatorsExportSnapshot = {
  generatedAt: string;
  trailingDays: number;
  overdueObservationFollowUps: number | null;
  observationsLinkedToCapaInWindow: number | null;
  repeatObservationClusters: {
    siteId: string | null;
    category: string;
    observationCount: number;
  }[] | null;
  observationsLinkedToVerifiedCapaInWindow: number | null;
};

function csvEscape(cell: string): string {
  if (/[",\n\r]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

export function leadingIndicatorsToCsv(data: LeadingIndicatorsExportSnapshot): string {
  const lines: string[][] = [
    ["metric", "key", "value"],
    ["meta", "generatedAt", data.generatedAt],
    ["meta", "trailingDays", String(data.trailingDays)],
    [
      "supervisory",
      "overdueObservationFollowUps",
      data.overdueObservationFollowUps != null ? String(data.overdueObservationFollowUps) : "",
    ],
    [
      "supervisory",
      "observationsLinkedToCapaInWindow",
      data.observationsLinkedToCapaInWindow != null
        ? String(data.observationsLinkedToCapaInWindow)
        : "",
    ],
    [
      "supervisory",
      "observationsLinkedToVerifiedCapaInWindow",
      data.observationsLinkedToVerifiedCapaInWindow != null
        ? String(data.observationsLinkedToVerifiedCapaInWindow)
        : "",
    ],
  ];

  const clusters = data.repeatObservationClusters;
  if (clusters && clusters.length > 0) {
    lines.push(["repeatClusters", "header", "siteId,category,observationCount"]);
    for (const c of clusters) {
      lines.push([
        "repeatClusters",
        "row",
        [c.siteId ?? "", c.category, String(c.observationCount)].join("|"),
      ]);
    }
  }

  return lines.map((r) => r.map(csvEscape).join(",")).join("\r\n");
}
