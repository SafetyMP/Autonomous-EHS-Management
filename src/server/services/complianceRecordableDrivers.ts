import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import type { Db } from "@/server/db";
import { establishment, incident, workRelatedInjuryIllnessRecord } from "@/server/db/schema";
import { RCA_FISHBONE_CATEGORY_IDS } from "@/lib/rcaFishbone";

const ROOT_CAUSE_SUMMARY_MAX = 240;

function incidentListTitle(row: {
  title: string;
  anonymizedAt: Date | null;
  pseudonymId: string | null;
}): string {
  if (row.anonymizedAt) {
    return row.pseudonymId
      ? `Redacted incident (${row.pseudonymId.slice(0, 8)}…)`
      : "Redacted incident";
  }
  return row.title;
}

export type RecordableInvestigationThemesResult = {
  fishboneCategoryCounts: { categoryId: string; label: string; count: number }[];
  causalFactorCategoryCounts: { category: string | null; count: number }[];
  contributingFactorCounts: { factor: string; count: number }[];
  incidents: {
    id: string;
    title: string;
    incidentType: string;
    occurredAt: Date | null;
    rootCauseSummary: string | null;
  }[];
  qualityFlags: {
    draftDeterminationCount: number;
    missingEstablishmentCount: number;
  };
};

export async function fetchRecordableInvestigationThemes(
  db: Db,
  args: {
    organizationId: string;
    calendarYear: number;
    establishmentId: string | null;
    includeRootCauseSummary: boolean;
  },
): Promise<RecordableInvestigationThemesResult> {
  const start = new Date(Date.UTC(args.calendarYear, 0, 1));
  const end = new Date(Date.UTC(args.calendarYear, 11, 31, 23, 59, 59, 999));

  const orgEstablishmentIds = (
    await db
      .select({ id: establishment.id })
      .from(establishment)
      .where(eq(establishment.organizationId, args.organizationId))
  ).map((r) => r.id);

  const conditions = [
    eq(workRelatedInjuryIllnessRecord.organizationId, args.organizationId),
    eq(workRelatedInjuryIllnessRecord.oshaRecordable, true),
    gte(incident.occurredAt, start),
    lte(incident.occurredAt, end),
  ];

  if (args.establishmentId) {
    conditions.push(eq(workRelatedInjuryIllnessRecord.establishmentId, args.establishmentId));
  } else if (orgEstablishmentIds.length > 0) {
    conditions.push(
      or(
        isNull(workRelatedInjuryIllnessRecord.establishmentId),
        inArray(workRelatedInjuryIllnessRecord.establishmentId, orgEstablishmentIds),
      )!,
    );
  }

  const rows = await db
    .select({
      determinationStatus: workRelatedInjuryIllnessRecord.determinationStatus,
      wrEstablishmentId: workRelatedInjuryIllnessRecord.establishmentId,
      incidentId: incident.id,
      title: incident.title,
      incidentType: incident.incidentType,
      occurredAt: incident.occurredAt,
      anonymizedAt: incident.anonymizedAt,
      pseudonymId: incident.pseudonymId,
      rcaFishbone: incident.rcaFishbone,
      investigationCausalFactors: incident.investigationCausalFactors,
      contributingFactors: incident.contributingFactors,
      rootCauseSummary: incident.rootCauseSummary,
    })
    .from(workRelatedInjuryIllnessRecord)
    .innerJoin(incident, eq(incident.id, workRelatedInjuryIllnessRecord.incidentId))
    .where(and(...conditions));

  const fishboneMap = new Map<string, number>();
  const causalCatMap = new Map<string | null, number>();
  const contribMap = new Map<string, number>();

  let draftDeterminationCount = 0;
  let missingEstablishmentCount = 0;

  const fishboneLabel: Record<string, string> = {
    people: "People",
    process: "Process",
    equipment: "Equipment",
    materials: "Materials",
    environment: "Environment",
    management: "Management",
  };

  const allowedFishbone = new Set<string>(RCA_FISHBONE_CATEGORY_IDS);

  for (const row of rows) {
    if (row.determinationStatus === "draft") draftDeterminationCount += 1;
    if (row.wrEstablishmentId == null) missingEstablishmentCount += 1;

    const bone = row.rcaFishbone;
    if (Array.isArray(bone)) {
      for (const b of bone) {
        if (!b || typeof b !== "object" || !("categoryId" in b)) continue;
        const cid = String((b as { categoryId: unknown }).categoryId);
        if (!allowedFishbone.has(cid)) continue;
        const causes = (b as { causes: unknown }).causes;
        const n = Array.isArray(causes) ? causes.filter((c) => typeof c === "string" && c.trim()).length : 0;
        if (n > 0) {
          fishboneMap.set(cid, (fishboneMap.get(cid) ?? 0) + 1);
        }
      }
    }

    const cfs = row.investigationCausalFactors;
    if (Array.isArray(cfs)) {
      for (const cf of cfs) {
        if (!cf || typeof cf !== "object") continue;
        const summary = String((cf as { summary?: unknown }).summary ?? "").trim();
        if (!summary) continue;
        const cat =
          (cf as { category?: unknown }).category != null &&
          String((cf as { category: unknown }).category).trim()
            ? String((cf as { category: string }).category).trim()
            : null;
        causalCatMap.set(cat, (causalCatMap.get(cat) ?? 0) + 1);
      }
    }

    const contrib = row.contributingFactors;
    if (Array.isArray(contrib)) {
      for (const f of contrib) {
        if (typeof f !== "string") continue;
        const t = f.trim();
        if (!t) continue;
        contribMap.set(t, (contribMap.get(t) ?? 0) + 1);
      }
    }
  }

  const fishboneCategoryCounts = [...fishboneMap.entries()]
    .map(([categoryId, count]) => ({
      categoryId,
      label: fishboneLabel[categoryId] ?? categoryId,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const causalFactorCategoryCounts = [...causalCatMap.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const contributingFactorCounts = [...contribMap.entries()]
    .map(([factor, count]) => ({ factor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 24);

  const incidents = rows.map((row) => {
    let rootCauseSummary: string | null = null;
    if (args.includeRootCauseSummary && row.rootCauseSummary?.trim()) {
      const s = row.rootCauseSummary.trim();
      rootCauseSummary =
        s.length > ROOT_CAUSE_SUMMARY_MAX ? `${s.slice(0, ROOT_CAUSE_SUMMARY_MAX)}…` : s;
    }
    return {
      id: row.incidentId,
      title: incidentListTitle(row),
      incidentType: row.incidentType,
      occurredAt: row.occurredAt,
      rootCauseSummary,
    };
  });

  incidents.sort((a, b) => {
    const ta = a.occurredAt?.getTime() ?? 0;
    const tb = b.occurredAt?.getTime() ?? 0;
    return tb - ta;
  });

  return {
    fishboneCategoryCounts,
    causalFactorCategoryCounts,
    contributingFactorCounts,
    incidents,
    qualityFlags: {
      draftDeterminationCount,
      missingEstablishmentCount,
    },
  };
}
