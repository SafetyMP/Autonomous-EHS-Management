import { db } from "@/server/db";
import {
  authenticateScimRequest,
  scimBaseUrl,
  scimJson,
} from "@/server/services/scim/scimRouteHelper";
import {
  addScimGroupMembers,
  getScimGroupByIdpGroupId,
  parseScimGroupPatchBody,
  removeScimGroupMembers,
} from "@/server/services/scim/scimGroups";
import { scimError, scimGroupResource } from "@/server/services/scim/scimResponse";

type RouteParams = { params: Promise<{ groupId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await authenticateScimRequest(request);
  if ("response" in auth) return auth.response;

  const { groupId } = await params;
  const idpGroupId = decodeURIComponent(groupId);
  const group = await getScimGroupByIdpGroupId(db, auth.ctx, idpGroupId);
  if (!group) {
    return scimJson(scimError(404, "Group not found."), 404);
  }

  const base = scimBaseUrl(request);
  return scimJson(scimGroupResource(group.mapping, group.memberUserIds, base));
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await authenticateScimRequest(request);
  if ("response" in auth) return auth.response;

  const { groupId } = await params;
  const idpGroupId = decodeURIComponent(groupId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return scimJson(scimError(400, "Invalid JSON."), 400);
  }

  const { addUserIds, removeUserIds } = parseScimGroupPatchBody(body);
  try {
    if (removeUserIds.length > 0) {
      await removeScimGroupMembers(db, auth.ctx, idpGroupId, removeUserIds);
    }
    if (addUserIds.length > 0) {
      await addScimGroupMembers(db, auth.ctx, idpGroupId, addUserIds);
    }
    const group = await getScimGroupByIdpGroupId(db, auth.ctx, idpGroupId);
    if (!group) {
      return scimJson(scimError(404, "Group not found."), 404);
    }
    const base = scimBaseUrl(request);
    return scimJson(scimGroupResource(group.mapping, group.memberUserIds, base));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("not found") ? 404 : 422;
    return scimJson(scimError(status, msg), status);
  }
}

export async function OPTIONS() {
  return scimJson(null, 204);
}
