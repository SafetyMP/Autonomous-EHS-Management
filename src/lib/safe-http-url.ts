/**
 * Validate or sanitize absolute HTTP(S) URLs for persistence and link rendering.
 * Rejects javascript:, data:, and other non-http schemes.
 */
export function isSafeHttpUrl(raw: string): boolean {
  try {
    const protocol = new URL(raw).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/** Returns a normalized http(s) href, or null when unsafe / unparseable. */
export function safeExternalHttpHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!isSafeHttpUrl(raw)) return null;
  try {
    return new URL(raw).toString();
  } catch {
    return null;
  }
}
