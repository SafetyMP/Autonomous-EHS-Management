import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { parseScimAuthorizationHeader } from "@/server/services/scim/scimToken";
import { resolveScimAuth, type ScimAuthContext } from "@/server/services/scim/scimAuth";
import { scimError } from "@/server/services/scim/scimResponse";

export async function authenticateScimRequest(
  request: Request,
): Promise<{ ctx: ScimAuthContext } | { response: NextResponse }> {
  const token = parseScimAuthorizationHeader(request.headers.get("authorization"));
  if (!token) {
    return {
      response: NextResponse.json(scimError(401, "Missing or invalid Bearer token."), {
        status: 401,
        headers: { "Content-Type": "application/scim+json" },
      }),
    };
  }

  const ctx = await resolveScimAuth(db, token);
  if (!ctx) {
    return {
      response: NextResponse.json(scimError(401, "Unauthorized."), {
        status: 401,
        headers: { "Content-Type": "application/scim+json" },
      }),
    };
  }

  return { ctx };
}

export function scimJson(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/scim+json" },
  });
}

export function scimBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
