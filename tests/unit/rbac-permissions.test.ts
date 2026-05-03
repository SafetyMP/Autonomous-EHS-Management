import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import {
  PERMISSIONS,
  assertPermission,
  userHasPermission,
  type PermissionKey,
} from "@/lib/rbac";
import { createRbacOnlyFakeDb } from "../helpers/fake-db";

const userId = "user_test_01";
const orgId = "00000000-0000-4000-8000-000000000001";

describe("PERMISSIONS", () => {
  it("exposes stable known keys needed by routers", () => {
    expect(PERMISSIONS.INCIDENT_CREATE).toBe("incident:create");
    expect(PERMISSIONS.INCIDENT_READ).toBe("incident:read");
    expect(PERMISSIONS.ASPECT_READ).toBe("aspect:read");
    expect(Object.values(PERMISSIONS).length).toBeGreaterThanOrEqual(8);
  });

  it("uses unique string values across all permission keys", () => {
    const values = Object.values(PERMISSIONS) as PermissionKey[];
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("userHasPermission", () => {
  it("returns true when the RBAC chain yields a matching row", async () => {
    const ok = await userHasPermission(createRbacOnlyFakeDb(true), userId, orgId, PERMISSIONS.INCIDENT_READ);
    expect(ok).toBe(true);
  });

  it("returns false when the RBAC chain is empty", async () => {
    const ok = await userHasPermission(createRbacOnlyFakeDb(false), userId, orgId, PERMISSIONS.INCIDENT_READ);
    expect(ok).toBe(false);
  });
});

describe("assertPermission", () => {
  it("resolves silently when authorized", async () => {
    await expect(
      assertPermission(createRbacOnlyFakeDb(true), userId, orgId, PERMISSIONS.CAPA_READ),
    ).resolves.toBeUndefined();
  });

  it("throws FORBIDDEN TRPCError with deterministic message shape", async () => {
    await expect(
      assertPermission(createRbacOnlyFakeDb(false), userId, orgId, PERMISSIONS.INCIDENT_UPDATE),
    ).rejects.toSatisfy((e: unknown) => {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("FORBIDDEN");
      expect((e as TRPCError).message).toBe(`Missing permission: ${PERMISSIONS.INCIDENT_UPDATE}`);
      return true;
    });
  });
});
