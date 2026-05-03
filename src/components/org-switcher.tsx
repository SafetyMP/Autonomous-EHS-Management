"use client";

import { useId } from "react";
import { useOrg } from "@/components/org-context";

export function OrgSwitcher() {
  const { organizations, organizationId, setOrganizationId } = useOrg();
  const selectId = useId();

  if (organizations.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 text-base sm:text-sm">
      <label htmlFor={selectId} className="font-medium text-zinc-700">
        Organization
      </label>
      <select
        id={selectId}
        value={organizationId ?? ""}
        onChange={(e) => setOrganizationId(e.target.value)}
        className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
      >
        <option value="" disabled>
          Select…
        </option>
        {organizations.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
