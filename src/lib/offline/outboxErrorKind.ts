/** Classify outbox replay failures for operator UX. */
export type OutboxErrorKind = "network" | "validation" | "conflict" | "forbidden" | "unknown";

export function classifyOutboxError(message: string): OutboxErrorKind {
  const m = message.toLowerCase();
  if (m.includes("not found") || m.includes("forbidden") || m.includes("missing permission")) {
    return m.includes("not found") ? "conflict" : "forbidden";
  }
  if (
    m.includes("invalid transition") ||
    m.includes("already") ||
    m.includes("conflict") ||
    m.includes("stale") ||
    m.includes("was deleted")
  ) {
    return "conflict";
  }
  if (
    m.includes("validation") ||
    m.includes("required") ||
    m.includes("invalid") ||
    m.includes("bad_request")
  ) {
    return "validation";
  }
  if (m.includes("fetch") || m.includes("network") || m.includes("timeout") || m.includes("failed to fetch")) {
    return "network";
  }
  return "unknown";
}

export function outboxErrorKindLabel(kind: OutboxErrorKind): string {
  switch (kind) {
    case "conflict":
      return "Server conflict — record may have changed elsewhere";
    case "validation":
      return "Validation — fix the queued payload";
    case "forbidden":
      return "Permission denied on replay";
    case "network":
      return "Network error";
    default:
      return "Sync error";
  }
}
