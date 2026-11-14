import { describe, expect, it } from "vitest";
import { organizationPreferenceKey, resolveOrganizationPreference } from "@/lib/dashboard/organizationPreference";

const memberships = [{ id: "org-north" }, { id: "org-south" }];

describe("organization selection preference", () => {
  it("restores a saved organization only when it remains a membership", () => {
    expect(resolveOrganizationPreference("org-south", memberships)).toBe("org-south");
  });

  it.each([null, "", "org-revoked", "org-outside-membership"])(
    "requires a selection rather than assuming a multi-organization scope for %s",
    (preferredId) => {
      expect(resolveOrganizationPreference(preferredId, memberships)).toBeNull();
    },
  );

  it.each([null, "org-revoked", "org-north"])(
    "selects the sole authorized organization when the saved preference is %s",
    (preferredId) => {
      expect(resolveOrganizationPreference(preferredId, [{ id: "org-north" }])).toBe("org-north");
    },
  );

  it("does not restore any scope after membership is removed", () => {
    expect(resolveOrganizationPreference("org-north", [])).toBeNull();
    expect(resolveOrganizationPreference(null, [])).toBeNull();
  });

  it("stores each user's preference under a separate key", () => {
    expect(organizationPreferenceKey("user-a")).toBe("ehs:organization:user-a");
    expect(organizationPreferenceKey("user-a")).not.toBe(organizationPreferenceKey("user-b"));
  });
});
