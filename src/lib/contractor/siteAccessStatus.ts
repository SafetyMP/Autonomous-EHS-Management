export type CredentialRow = {
  kind: string;
  status: string;
  validTo: Date | null;
};

export type SiteAccessStatus = "cleared" | "blocked" | "review_required" | "unknown";

export type PartyComplianceSummary = {
  siteAccessStatus: SiteAccessStatus;
  siteAccessBlocked: boolean;
  reasons: string[];
  activeCredentialCount: number;
  expiredCredentialCount: number;
  dueSoonCredentialCount: number;
};

const MS_DAY = 24 * 60 * 60 * 1000;

/**
 * Program-level site access signal for contractors (not physical gate control).
 * Blocked when required COI is missing/expired or any credential is expired/rejected.
 */
export function computePartyComplianceSummary(
  partyType: string,
  credentials: CredentialRow[],
  now = new Date(),
): PartyComplianceSummary {
  const horizon = new Date(now.getTime() + 30 * MS_DAY);
  let activeCredentialCount = 0;
  let expiredCredentialCount = 0;
  let dueSoonCredentialCount = 0;
  const reasons: string[] = [];

  for (const c of credentials) {
    if (c.status === "rejected") {
      reasons.push(`${formatKind(c.kind)} rejected`);
      continue;
    }
    if (c.validTo && c.validTo < now) {
      expiredCredentialCount += 1;
      if (c.status !== "expired") {
        reasons.push(`${formatKind(c.kind)} past valid-to`);
      }
      continue;
    }
    if (c.status === "active") activeCredentialCount += 1;
    if (c.validTo && c.validTo <= horizon) dueSoonCredentialCount += 1;
    if (c.status === "pending_review") {
      reasons.push(`${formatKind(c.kind)} pending review`);
    }
  }

  const isContractor = partyType === "contractor" || partyType === "vendor";
  const activeCoi = credentials.some(
    (c) =>
      c.kind === "insurance_coi" &&
      c.status === "active" &&
      (!c.validTo || c.validTo >= now),
  );

  if (credentials.length === 0) {
    if (isContractor) reasons.push("No credentials on file");
    return {
      siteAccessStatus: isContractor ? "blocked" : "unknown",
      siteAccessBlocked: isContractor,
      reasons,
      activeCredentialCount,
      expiredCredentialCount,
      dueSoonCredentialCount,
    };
  }

  if (expiredCredentialCount > 0 || reasons.some((r) => r.includes("rejected"))) {
    return {
      siteAccessStatus: "blocked",
      siteAccessBlocked: true,
      reasons,
      activeCredentialCount,
      expiredCredentialCount,
      dueSoonCredentialCount,
    };
  }

  if (isContractor && !activeCoi) {
    reasons.push("Active certificate of insurance (COI) required");
    return {
      siteAccessStatus: "blocked",
      siteAccessBlocked: true,
      reasons,
      activeCredentialCount,
      expiredCredentialCount,
      dueSoonCredentialCount,
    };
  }

  if (reasons.length > 0 || dueSoonCredentialCount > 0) {
    return {
      siteAccessStatus: "review_required",
      siteAccessBlocked: false,
      reasons,
      activeCredentialCount,
      expiredCredentialCount,
      dueSoonCredentialCount,
    };
  }

  return {
    siteAccessStatus: "cleared",
    siteAccessBlocked: false,
    reasons: [],
    activeCredentialCount,
    expiredCredentialCount,
    dueSoonCredentialCount,
  };
}

function formatKind(kind: string): string {
  return kind.replace(/_/g, " ");
}
