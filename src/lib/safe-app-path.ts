/**
 * Restrict post-auth navigation to same-app relative paths (no open redirects).
 */
export function safeAppRelativePath(candidate: string, fallback: string): string {
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  try {
    const u = new URL(candidate, "http://local.invalid");
    if (u.username || u.password || u.host !== "local.invalid") return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
