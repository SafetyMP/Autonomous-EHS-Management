import { describe, expect, it } from "vitest";
import {
  parseScimPatchBody,
  parseScimUserNameFilter,
} from "@/server/services/scim/scimUsers";
import { parseScimGroupPatchBody } from "@/server/services/scim/scimGroups";
import { resolveRoleSlugFromGroupIds } from "@/server/services/scim/scimGroupRole";

describe("parseScimUserNameFilter", () => {
  it("parses userName eq filter", () => {
    expect(parseScimUserNameFilter('userName eq "a@b.com"')).toBe("a@b.com");
  });
});

describe("parseScimPatchBody", () => {
  it("parses userName and active operations", () => {
    const patch = parseScimPatchBody({
      Operations: [
        { op: "replace", path: "userName", value: "new@example.com" },
        { op: "replace", path: "active", value: false },
      ],
    });
    expect(patch.userName).toBe("new@example.com");
    expect(patch.active).toBe(false);
  });
});

describe("parseScimGroupPatchBody", () => {
  it("extracts member add/remove ids", () => {
    const { addUserIds, removeUserIds } = parseScimGroupPatchBody({
      Operations: [
        {
          op: "add",
          path: "members",
          value: [{ value: "user-1" }, { value: "user-2" }],
        },
        { op: "remove", path: "members", value: [{ value: "user-3" }] },
      ],
    });
    expect(addUserIds).toEqual(["user-1", "user-2"]);
    expect(removeUserIds).toEqual(["user-3"]);
  });
});

describe("resolveRoleSlugFromGroupIds", () => {
  it("returns default when no mappings match", async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: async () => [],
        }),
      }),
    };
    const slug = await resolveRoleSlugFromGroupIds(
      db as never,
      "00000000-0000-4000-8000-000000000001",
      ["unknown-group"],
      "supervisor",
    );
    expect(slug).toBe("supervisor");
  });
});

describe("listScimGroups", () => {
  it("returns empty array when org has no group mappings", async () => {
    const { listScimGroups } = await import("@/server/services/scim/scimGroups");
    const db = {
      select: () => ({
        from: () => ({
          where: async () => [],
        }),
      }),
    };

    const groups = await listScimGroups(db as never, {
      organizationId: "00000000-0000-4000-8000-000000000001",
      defaultRoleSlug: "worker",
    });

    expect(groups).toEqual([]);
  });
});
