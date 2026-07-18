import { describe, expect, it, vi } from "vitest";
import { userHasMembershipOutsideOrg } from "@/server/services/scim/crossTenantIdentity";
import { revokeUserSessions } from "@/server/services/scim/revokeUserSessions";

describe("userHasMembershipOutsideOrg", () => {
  it("returns true when count > 0", async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ n: 2 }],
          }),
        }),
      }),
    };
    await expect(
      userHasMembershipOutsideOrg(db as never, "user-1", "org-a"),
    ).resolves.toBe(true);
  });

  it("returns false when count is 0", async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ n: 0 }],
          }),
        }),
      }),
    };
    await expect(
      userHasMembershipOutsideOrg(db as never, "user-1", "org-a"),
    ).resolves.toBe(false);
  });
});

describe("revokeUserSessions cross-tenant skip", () => {
  it("skips delete when user has other-org memberships", async () => {
    const deleteFn = vi.fn();
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ n: 1 }],
          }),
        }),
      }),
      delete: deleteFn,
    };
    const result = await revokeUserSessions(db as never, "user-1", "org-a");
    expect(result).toEqual({ revoked: 0, skippedReason: "cross_tenant_memberships" });
    expect(deleteFn).not.toHaveBeenCalled();
  });
});
