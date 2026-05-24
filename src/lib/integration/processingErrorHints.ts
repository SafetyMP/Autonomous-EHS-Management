export type IntegrationErrorHint = {
  title: string;
  remediation: string;
};

const RULES: { match: RegExp; hint: IntegrationErrorHint }[] = [
  {
    match: /No user matches workerEmail/i,
    hint: {
      title: "Worker email not found in EHS",
      remediation:
        "Provision the user via SCIM or OIDC first, then replay the HRIS event. Confirm email casing matches the IdP.",
    },
  },
  {
    match: /not a member of this organization/i,
    hint: {
      title: "User exists but lacks org membership",
      remediation:
        "Add membership via SCIM group mapping or HRIS joiner path. Verify organizationId in the iPaaS recipe.",
    },
  },
  {
    match: /invalid siteId|site not found/i,
    hint: {
      title: "HRIS location mapping failed",
      remediation:
        "Maintain HRIS location code → EHS site UUID lookup in Workato/Boomi. Create sites before first sync.",
    },
  },
  {
    match: /Roster snapshot reprocess is not supported/i,
    hint: {
      title: "Roster snapshot cannot be retried from backlog",
      remediation: "Re-post the roster_snapshot batch to POST /api/integration/inbound with a fresh export.",
    },
  },
  {
    match: /idempotency|duplicate/i,
    hint: {
      title: "Duplicate or idempotent replay",
      remediation:
        "Usually safe — confirm integration_event shows applied. Change idempotencyKey only when payload changed.",
    },
  },
];

export function hintForIntegrationProcessingError(
  processingError: string | null | undefined,
): IntegrationErrorHint | null {
  if (!processingError?.trim()) return null;
  for (const rule of RULES) {
    if (rule.match.test(processingError)) return rule.hint;
  }
  return {
    title: "Processing error",
    remediation:
      "Inspect payload in warehouse export, fix upstream mapping, then Retry. See docs/runbooks/workday-hris-connector.md.",
  };
}
