/** CSV companion for observation follow-up SLA (`analytics.observationFollowUpSla`). */

export type ObservationFollowUpSlaCsvSnapshot = {
  generatedAt: string;
  overdueFollowUpCount: number;
  followUpDueWithin7DaysCount: number;
  openObservationWithFollowUpCount: number;
  observationEscalationsLast90Days: number;
  overdueSamples: {
    id: string;
    summary: string;
    status: string;
    followUpDueAt: Date | null;
    assigneeUserId: string | null;
  }[];
};

function csvEscape(cell: string): string {
  if (/[",\n\r]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

export function observationFollowUpSlaToCsv(data: ObservationFollowUpSlaCsvSnapshot): string {
  const lines: string[][] = [
    ["section", "metric", "value"],
    ["meta", "generatedAt", data.generatedAt],
    ["rollup", "overdueFollowUpCount", String(data.overdueFollowUpCount)],
    ["rollup", "followUpDueWithin7DaysCount", String(data.followUpDueWithin7DaysCount)],
    ["rollup", "openObservationWithFollowUpCount", String(data.openObservationWithFollowUpCount)],
    ["rollup", "observationEscalationsLast90Days", String(data.observationEscalationsLast90Days)],
  ];

  for (const row of data.overdueSamples) {
    const payload = [
      `summary=${row.summary}`,
      `status=${row.status}`,
      row.followUpDueAt ? `due=${row.followUpDueAt.toISOString()}` : "due=",
      row.assigneeUserId ? `assignee=${row.assigneeUserId}` : "assignee=",
    ].join("\t");

    lines.push(["sample_overdue", row.id, payload]);
  }

  return `${lines.map((r) => r.map(csvEscape).join(",")).join("\n")}\n`;
}
