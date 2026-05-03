/** Parse ContextSync URIs scoped to tenant org UUID: ctx://{org_uuid}/{domain}/{artifact_path...} */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DOMAIN_RE = /^[a-z0-9][a-z0-9_-]{0,126}$/i;

export type ParsedCtxUri = {
  orgId: string;
  domain: string;
  artifactPath: string;
  uri: string;
};

export function parseCtxUri(uri: string): ParsedCtxUri | null {
  if (!uri.startsWith("ctx://")) {
    return null;
  }
  const raw = uri.slice("ctx://".length);
  const segments = raw.split("/").filter((s) => s.length > 0);
  if (segments.length < 3) {
    return null;
  }
  const [orgId, domain, ...pathParts] = segments;
  if (!UUID_RE.test(orgId) || pathParts.length === 0 || !DOMAIN_RE.test(domain)) {
    return null;
  }
  const artifactPath = pathParts.join("/");
  if (artifactPath.length > 1024) {
    return null;
  }
  return {
    uri,
    orgId,
    domain,
    artifactPath,
  };
}

export function buildCtxUri(orgId: string, domain: string, artifactPath: string): string {
  const p = artifactPath.replace(/^\/+/, "").replace(/\/+$/, "");
  return `ctx://${orgId}/${domain}/${p}`;
}
