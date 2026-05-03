/**
 * CSV export for `audit_log` rows (diligence / auditor handoff). One row per event; payload as JSON string.
 */

export type AuditTrailCsvRow = {
  id: string;
  organizationId: string;
  createdAtIso: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  payloadJson: string;
};

function csvEscapeCell(cell: string): string {
  if (/[",\n\r]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

const HEADER: (keyof AuditTrailCsvRow)[] = [
  "id",
  "organizationId",
  "createdAtIso",
  "action",
  "entityType",
  "entityId",
  "actorUserId",
  "actorName",
  "actorEmail",
  "payloadJson",
];

export function auditTrailRowsToCsv(rows: AuditTrailCsvRow[]): string {
  const lines = [HEADER.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscapeCell(r.id),
        csvEscapeCell(r.organizationId),
        csvEscapeCell(r.createdAtIso),
        csvEscapeCell(r.action),
        csvEscapeCell(r.entityType),
        csvEscapeCell(r.entityId),
        csvEscapeCell(r.actorUserId ?? ""),
        csvEscapeCell(r.actorName ?? ""),
        csvEscapeCell(r.actorEmail ?? ""),
        csvEscapeCell(r.payloadJson),
      ].join(","),
    );
  }
  return lines.join("\n");
}
