import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import {
  authenticateScimRequest,
  scimBaseUrl,
  scimJson,
} from "@/server/services/scim/scimRouteHelper";
import {
  createScimUser,
  listScimUsers,
  parseScimUserNameFilter,
} from "@/server/services/scim/scimUsers";
import { scimError, scimListResponse, scimUserResource } from "@/server/services/scim/scimResponse";

const createUserSchema = z.object({
  userName: z.string().email(),
  externalId: z.string().max(128).optional(),
  active: z.boolean().optional(),
  name: z.object({ formatted: z.string().optional() }).optional(),
  groups: z.array(z.object({ value: z.string().min(1) })).optional(),
});

export async function GET(request: Request) {
  const auth = await authenticateScimRequest(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const filterEmail = parseScimUserNameFilter(url.searchParams.get("filter"));
  const rows = await listScimUsers(db, auth.ctx, filterEmail);
  const base = scimBaseUrl(request);
  const resources = rows.map((r) => scimUserResource(r.user, r.membership, base));
  return scimJson(scimListResponse(resources, resources.length));
}

export async function POST(request: Request) {
  const auth = await authenticateScimRequest(request);
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return scimJson(scimError(400, "Invalid JSON."), 400);
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return scimJson(scimError(400, parsed.error.message), 400);
  }

  try {
    const row = await createScimUser(db, auth.ctx, {
      userName: parsed.data.userName,
      externalId: parsed.data.externalId,
      active: parsed.data.active,
      name: parsed.data.name,
      groupIds: parsed.data.groups?.map((g) => g.value),
    });
    const base = scimBaseUrl(request);
    return scimJson(scimUserResource(row.user, row.membership, base), 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("already provisioned") ? 409 : 422;
    return scimJson(scimError(status, msg), status);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
    },
  });
}
