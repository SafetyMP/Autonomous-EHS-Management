"use client";

import { useId } from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "@/components/org-context";

export function OrgSwitcher() {
  const { organizations, organizationId, setOrganizationId } = useOrg();
  const selectId = useId();
  const router = useRouter();
  const current = organizations.find((organization) => organization.id === organizationId);

  if (organizations.length === 1) {
    return <div className="min-w-0 text-sm"><span className="block text-xs text-text-muted">Organization</span><span className="block truncate font-semibold text-foreground">{current?.name ?? organizations[0]?.name}</span></div>;
  }

  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      <label htmlFor={selectId} className="text-xs font-medium text-text-muted">Organization</label>
      <select id={selectId} value={organizationId ?? ""} onChange={(event) => {
        setOrganizationId(event.target.value);
        router.replace("/dashboard");
      }}
        className="min-h-11 w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
        <option value="" disabled>Select organization…</option>
        {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
      </select>
    </div>
  );
}
