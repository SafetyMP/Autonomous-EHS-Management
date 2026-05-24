/** Decode JWT payload without verification — IdP token already validated at OAuth sign-in. */
export function decodeJwtPayload(idToken: string): Record<string, unknown> | null {
  const parts = idToken.split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1]!, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Extract string claim values (scalar or array) from JWT payload. */
export function claimValuesFromPayload(
  payload: Record<string, unknown>,
  claimKey: string,
): string[] {
  const raw = payload[claimKey];
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string");
  }
  return [];
}
