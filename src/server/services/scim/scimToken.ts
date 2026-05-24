import { createHash, randomBytes } from "node:crypto";

export function hashScimBearerToken(plain: string): string {
  return createHash("sha256").update(plain.trim(), "utf8").digest("hex");
}

/** Cryptographically random bearer token for org SCIM provisioning. */
export function generateScimBearerToken(): string {
  return randomBytes(32).toString("base64url");
}

export function parseScimAuthorizationHeader(header: string | null): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length >= 16 ? token : null;
}
