/** Glob match for ContextSync URIs per protocol-style patterns (* segment, ** path). */

function uriSegments(uri: string): string[] | null {
  if (!uri.startsWith("ctx://")) return null;
  const parts = uri.slice("ctx://".length).split("/").filter(Boolean);
  return parts.length >= 3 ? parts : null;
}

function patternSegments(pattern: string): string[] | null {
  if (pattern === "*") {
    return ["**"];
  }
  if (!pattern.startsWith("ctx://")) return null;
  const parts = pattern.slice("ctx://".length).split("/").filter(Boolean);
  return parts.length >= 1 ? parts : null;
}

function matchGlobSegments(pat: readonly string[], val: readonly string[]): boolean {
  const p = [...pat];
  const v = [...val];
  return matchGlobSegmentsInner(p, v);
}

function matchGlobSegmentsInner(p: string[], v: string[]): boolean {
  if (p.length === 0 && v.length === 0) return true;
  if (p.length === 0 || v.length === 0) {
    return p.length > 0 && p[0] === "**" && p.length === 1;
  }
  const pc = p[0];
  const vc = v[0];

  if (pc === "**") {
    if (p.length === 1) return true;
    for (let i = 0; i <= v.length; i++) {
      if (matchGlobSegmentsInner(p.slice(1), v.slice(i))) {
        return true;
      }
    }
    return false;
  }

  if (pc === "*" || pc === vc) {
    return matchGlobSegmentsInner(p.slice(1), v.slice(1));
  }

  return false;
}

/** Returns true when `artifactUri` matches `pattern`. */
export function ctxUriGlobMatch(pattern: string, artifactUri: string): boolean {
  const ps = patternSegments(pattern);
  const vs = uriSegments(artifactUri);
  if (!ps || !vs) return false;
  return matchGlobSegments(ps, vs);
}
