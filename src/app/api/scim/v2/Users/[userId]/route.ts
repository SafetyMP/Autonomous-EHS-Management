import { db } from "@/server/db";
import {
  authenticateScimRequest,
  scimBaseUrl,
  scimJson,
} from "@/server/services/scim/scimRouteHelper";
import {
  deactivateScimUser,
  getScimUserById,
  patchScimUser,
  parseScimPatchBody,
} from "@/server/services/scim/scimUsers";
import { scimError, scimUserResource } from "@/server/services/scim/scimResponse";

type RouteParams = { params: Promise<{ userId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await authenticateScimRequest(request);
  if ("response" in auth) return auth.response;

  const { userId } = await params;
  const row = await getScimUserById(db, auth.ctx, userId);
  if (!row) {
    return scimJson(scimError(404, "User not found."), 404);
  }

  const base = scimBaseUrl(request);
  return scimJson(scimUserResource(row.user, row.membership, base));
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await authenticateScimRequest(request);
  if ("response" in auth) return auth.response;

  const { userId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return scimJson(scimError(400, "Invalid JSON."), 400);
  }

  const patch = parseScimPatchBody(body);
  try {
    const row = await patchScimUser(db, auth.ctx, userId, patch);
    const base = scimBaseUrl(request);
    return scimJson(scimUserResource(row.user, row.membership, base));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("not found") ? 404 : 422;
    return scimJson(scimError(status, msg), status);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await authenticateScimRequest(request);
  if ("response" in auth) return auth.response;

  const { userId } = await params;
  try {
    await deactivateScimUser(db, auth.ctx, userId);
    return new Response(null, { status: 204 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return scimJson(scimError(404, msg), 404);
  }
}
