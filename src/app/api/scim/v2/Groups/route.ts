import { NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  authenticateScimRequest,
  scimBaseUrl,
  scimJson,
} from "@/server/services/scim/scimRouteHelper";
import { listScimGroups } from "@/server/services/scim/scimGroups";
import { scimGroupResource, scimListResponse } from "@/server/services/scim/scimResponse";

export async function GET(request: Request) {
  const auth = await authenticateScimRequest(request);
  if ("response" in auth) return auth.response;

  const groups = await listScimGroups(db, auth.ctx);
  const base = scimBaseUrl(request);
  const resources = groups.map(({ mapping, memberUserIds }) =>
    scimGroupResource(mapping, memberUserIds, base),
  );
  return scimJson(scimListResponse(resources, resources.length));
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: "GET, OPTIONS" },
  });
}
