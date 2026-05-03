export type CommandCenterFeedKind =
  | "incident"
  | "corrective_action"
  | "work_permit"
  | "observation"
  | "inspection"
  | "audit_finding"
  | "risk_assessment"
  | "environmental_regulatory_permit";

export type CommandCenterFeedItem = {
  kind: CommandCenterFeedKind;
  entityId: string;
  title: string;
  path: string;
  occurredAt: string;
  meta: string | null;
};

type IncidentFeedRow = {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
};

type CapaFeedRow = {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
};

type PermitFeedRow = {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
};

type ObservationFeedRow = {
  id: string;
  summary: string;
  status: string;
  updatedAt: Date;
};

type InspectionFeedRow = {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
};

type AuditFindingFeedRow = {
  id: string;
  title: string;
  findingType: string;
  createdAt: Date;
};

export type RiskAssessmentFeedRow = {
  id: string;
  summaryTitle: string | null;
  context: string;
  assessmentKind: string;
  status: string;
  reviewDueAt: Date | null;
  updatedAt: Date;
};

export type EnvironmentalRegulatoryPermitFeedRow = {
  id: string;
  title: string;
  status: string;
  expiresAt: Date | null;
  updatedAt: Date;
};

function mapIncidentRows(rows: IncidentFeedRow[]): CommandCenterFeedItem[] {
  return rows.map((r) => ({
    kind: "incident" as const,
    entityId: r.id,
    title: r.title,
    path: `/dashboard/incidents/${r.id}`,
    occurredAt: r.updatedAt.toISOString(),
    meta: r.status,
  }));
}

function mapCapaRows(rows: CapaFeedRow[]): CommandCenterFeedItem[] {
  return rows.map((r) => ({
    kind: "corrective_action" as const,
    entityId: r.id,
    title: r.title,
    path: `/dashboard/capa#capa-row-${r.id}`,
    occurredAt: r.updatedAt.toISOString(),
    meta: r.status,
  }));
}

function mapPermitRows(rows: PermitFeedRow[]): CommandCenterFeedItem[] {
  return rows.map((r) => ({
    kind: "work_permit" as const,
    entityId: r.id,
    title: r.title,
    path: `/dashboard/permits/${r.id}`,
    occurredAt: r.updatedAt.toISOString(),
    meta: r.status,
  }));
}

function mapObservationRows(rows: ObservationFeedRow[]): CommandCenterFeedItem[] {
  return rows.map((r) => ({
    kind: "observation" as const,
    entityId: r.id,
    title: r.summary,
    path: `/dashboard/observations/${r.id}`,
    occurredAt: r.updatedAt.toISOString(),
    meta: r.status,
  }));
}

function mapInspectionRows(rows: InspectionFeedRow[]): CommandCenterFeedItem[] {
  return rows.map((r) => ({
    kind: "inspection" as const,
    entityId: r.id,
    title: r.title,
    path: `/dashboard/inspections/${r.id}`,
    occurredAt: r.updatedAt.toISOString(),
    meta: r.status,
  }));
}

function mapAuditFindingRows(rows: AuditFindingFeedRow[]): CommandCenterFeedItem[] {
  return rows.map((r) => ({
    kind: "audit_finding" as const,
    entityId: r.id,
    title: r.title,
    path: "/dashboard/audits",
    occurredAt: r.createdAt.toISOString(),
    meta: r.findingType,
  }));
}

function mapRiskAssessmentRows(rows: RiskAssessmentFeedRow[]): CommandCenterFeedItem[] {
  return rows.map((r) => {
    const title =
      r.summaryTitle?.trim() ||
      `${r.context.slice(0, 72)}${r.context.length > 72 ? "…" : ""}`;
    const metaParts = [r.assessmentKind.replaceAll("_", " "), r.status.replaceAll("_", " ")];
    if (r.reviewDueAt) {
      metaParts.push(`review ${r.reviewDueAt.toISOString().slice(0, 10)}`);
    }
    return {
      kind: "risk_assessment" as const,
      entityId: r.id,
      title,
      path: `/dashboard/risk-assessments/${r.id}`,
      occurredAt: r.updatedAt.toISOString(),
      meta: metaParts.join(" · "),
    };
  });
}

function mapEnvironmentalRegulatoryPermitRows(
  rows: EnvironmentalRegulatoryPermitFeedRow[],
): CommandCenterFeedItem[] {
  return rows.map((r) => ({
    kind: "environmental_regulatory_permit" as const,
    entityId: r.id,
    title: r.title,
    path: `/dashboard/environmental-permits/${r.id}`,
    occurredAt: r.updatedAt.toISOString(),
    meta: r.expiresAt
      ? `${r.status.replaceAll("_", " ")} · expires ${r.expiresAt.toISOString().slice(0, 10)}`
      : r.status.replaceAll("_", " "),
  }));
}

/** Merge newest-first, same ordering as legacy six push loops. */
export function buildSortedActivityFeed(
  rows: {
    incidents: IncidentFeedRow[];
    capas: CapaFeedRow[];
    permits: PermitFeedRow[];
    observations: ObservationFeedRow[];
    inspections: InspectionFeedRow[];
    findings: AuditFindingFeedRow[];
    riskAssessments: RiskAssessmentFeedRow[];
    environmentalRegulatoryPermits: EnvironmentalRegulatoryPermitFeedRow[];
  },
  feedMax: number,
): CommandCenterFeedItem[] {
  const merged: CommandCenterFeedItem[] = [
    ...mapIncidentRows(rows.incidents),
    ...mapCapaRows(rows.capas),
    ...mapPermitRows(rows.permits),
    ...mapObservationRows(rows.observations),
    ...mapInspectionRows(rows.inspections),
    ...mapAuditFindingRows(rows.findings),
    ...mapRiskAssessmentRows(rows.riskAssessments),
    ...mapEnvironmentalRegulatoryPermitRows(rows.environmentalRegulatoryPermits),
  ];
  merged.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  return merged.slice(0, feedMax);
}
