import type { ParsedCtxUri } from "./parseCtxUri";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ImsLinkedKind = "policy_revision" | "rag_source" | "controlled_document";

export type ParsedImsLinked = {
  kind: ImsLinkedKind;
  id: string;
};

/**
 * Canonical merge surface: IMS is authoritative; ContextSync exposes read/provenance aliases.
 *
 * URIs:
 * - ctx://{org}/ims/policy-revision/{policy_revision_id}
 * - ctx://{org}/ims/rag-source/{rag_source_id}
 * - ctx://{org}/ims/controlled-document/{controlled_document_id}
 */
export function parseImsLinkedUri(parsed: ParsedCtxUri): ParsedImsLinked | null {
  if (parsed.domain !== "ims") {
    return null;
  }
  const parts = parsed.artifactPath.split("/").filter(Boolean);
  if (parts.length !== 2) {
    return null;
  }
  const [kindSeg, rawId] = parts;
  if (!UUID_RE.test(rawId)) {
    return null;
  }

  switch (kindSeg) {
    case "policy-revision":
      return { kind: "policy_revision", id: rawId };
    case "rag-source":
      return { kind: "rag_source", id: rawId };
    case "controlled-document":
      return { kind: "controlled_document", id: rawId };
    default:
      return null;
  }
}
