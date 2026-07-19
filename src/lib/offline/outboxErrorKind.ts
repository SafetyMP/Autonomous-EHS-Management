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
    case "unknown":
      return "Sync error";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/** Plain-language next step; conflict copy forbids multi-device merge (D-010). */
export function outboxErrorKindGuidance(kind: OutboxErrorKind): string {
  switch (kind) {
    case "conflict":
      return "The server copy may have changed or been deleted while this device was offline. Remove from device and re-enter from the live form — queued changes are not merged across devices.";
    case "validation":
      return "Fix the underlying data (or discard this queue item), then retry. Retries will keep failing until the payload is valid.";
    case "forbidden":
      return "Your role may lack permission for this replay. Ask an admin, or Remove from device and hand off to someone with rights.";
    case "network":
      return "Check connectivity, then use Retry failed syncs. The item stays on this device until it sends.";
    case "unknown":
      return "Review the error detail, fix the cause if you can, then retry — or Remove from device and submit again online.";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
