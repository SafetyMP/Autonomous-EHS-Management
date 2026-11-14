/** A stored UI preference never grants organization membership. */
export function resolveOrganizationPreference(
  preferredId: string | null,
  organizations: readonly { id: string }[],
): string | null {
  if (preferredId && organizations.some((org) => org.id === preferredId)) return preferredId;
  return organizations.length === 1 ? organizations[0]?.id ?? null : null;
}

export function organizationPreferenceKey(userId: string): string {
  return `ehs:organization:${userId}`;
}
