import type { authUser, membership } from "@/server/db/schema";

type UserRow = typeof authUser.$inferSelect;
type MembershipRow = typeof membership.$inferSelect;

export function scimUserResource(
  user: UserRow,
  mem: MembershipRow,
  baseUrl: string,
): Record<string, unknown> {
  const active = mem.lifecycleStatus === "active";
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: user.id,
    externalId: mem.externalWorkerId ?? undefined,
    userName: user.email,
    name: {
      formatted: user.name,
    },
    emails: [{ value: user.email, primary: true }],
    active,
    meta: {
      resourceType: "User",
      location: `${baseUrl}/api/scim/v2/Users/${user.id}`,
    },
  };
}

export function scimListResponse(
  resources: Record<string, unknown>[],
  total: number,
): Record<string, unknown> {
  return {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: total,
    startIndex: 1,
    itemsPerPage: resources.length,
    Resources: resources,
  };
}

export function scimError(status: number, detail: string): Record<string, unknown> {
  return {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
    status: String(status),
    detail,
  };
}
