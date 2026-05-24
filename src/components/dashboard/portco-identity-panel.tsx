"use client";

import { useState, type FormEvent } from "react";
import {
  dfHelperXs,
  dfMuted,
  dfPanelHeading,
  dfSecondaryOutline,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

export function PortCoIdentityPanel({ organizationId }: { organizationId: string }) {
  const utils = trpc.useUtils();
  const panel = trpc.portcoIdentity.scimPanel.useQuery({ organizationId });
  const rules = trpc.portcoIdentity.listOidcJitRules.useQuery({ organizationId });

  const [defaultRoleSlug, setDefaultRoleSlug] = useState("supervisor");
  const [scimEnabled, setScimEnabled] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const [ruleClaim, setRuleClaim] = useState("groups");
  const [ruleMatch, setRuleMatch] = useState("");
  const [ruleRole, setRuleRole] = useState("supervisor");

  const updateScim = trpc.portcoIdentity.updateScimConfig.useMutation({
    onSuccess: () => void utils.portcoIdentity.scimPanel.invalidate({ organizationId }),
  });
  const rotateToken = trpc.portcoIdentity.rotateScimBearerToken.useMutation({
    onSuccess: (data) => {
      setNewToken(data.bearerToken);
      void utils.portcoIdentity.scimPanel.invalidate({ organizationId });
    },
  });
  const upsertRule = trpc.portcoIdentity.upsertOidcJitRule.useMutation({
    onSuccess: () => {
      void utils.portcoIdentity.listOidcJitRules.invalidate({ organizationId });
      setRuleMatch("");
    },
  });
  const deleteRule = trpc.portcoIdentity.deleteOidcJitRule.useMutation({
    onSuccess: () => void utils.portcoIdentity.listOidcJitRules.invalidate({ organizationId }),
  });

  if (panel.isLoading) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-zinc-600" role="status">
          Loading PortCo identity…
        </p>
      </section>
    );
  }

  const syncedEnabled = panel.data?.enabled ?? false;
  const syncedRole = panel.data?.defaultRoleSlug ?? "supervisor";
  const displayEnabled = updateScim.isPending ? scimEnabled : syncedEnabled;
  const displayRole = updateScim.isPending ? defaultRoleSlug : syncedRole;

  function saveScim(ev: FormEvent) {
    ev.preventDefault();
    updateScim.mutate({
      organizationId,
      enabled: displayEnabled,
      defaultRoleSlug: displayRole.trim() || "supervisor",
    });
  }

  function addRule(ev: FormEvent) {
    ev.preventDefault();
    if (!ruleMatch.trim()) return;
    upsertRule.mutate({
      organizationId,
      claimKey: ruleClaim.trim() || "groups",
      matchValue: ruleMatch.trim(),
      roleSlug: ruleRole.trim() || "supervisor",
      priority: 100,
      enabled: true,
    });
  }

  return (
    <div className="space-y-6">
      <section
        className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-4 shadow-sm"
        aria-label="SCIM provisioning"
      >
        <h2 className={dfPanelHeading}>SCIM 2.0 provisioning</h2>
        <p className={`mt-1 text-sm ${dfMuted}`}>
          IdP-driven user create/deactivate at{" "}
          <code className="text-xs">POST /api/scim/v2/Users</code>. Bearer token is per organization.
        </p>

        <form className="mt-4 space-y-3" onSubmit={saveScim}>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-zinc-900">
            <input
              type="checkbox"
              checked={displayEnabled}
              onChange={(e) => setScimEnabled(e.target.checked)}
            />
            SCIM enabled
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-800">
            Default role slug for new SCIM users
            <input
              className="max-w-xs rounded border border-zinc-300 px-2 py-1.5 text-sm"
              value={displayRole}
              onChange={(e) => setDefaultRoleSlug(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={dfSecondaryOutline} disabled={updateScim.isPending}>
              {updateScim.isPending ? "Saving…" : "Save SCIM settings"}
            </button>
            <button
              type="button"
              className={dfSecondaryOutline}
              disabled={rotateToken.isPending}
              onClick={() => rotateToken.mutate({ organizationId })}
            >
              {rotateToken.isPending ? "Rotating…" : "Rotate bearer token"}
            </button>
          </div>
        </form>

        <p className={`mt-2 ${dfHelperXs}`}>
          Token configured: {panel.data?.hasBearerToken ? "yes" : "no — rotate to generate"}
        </p>
        {newToken ? (
          <p className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 font-mono text-xs text-amber-950">
            Copy now — token will not be shown again: {newToken}
          </p>
        ) : null}
      </section>

      <section
        className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
        aria-label="OIDC JIT claim rules"
      >
        <h2 className={dfPanelHeading}>Multi-org OIDC JIT rules</h2>
        <p className={`mt-1 text-sm ${dfMuted}`}>
          Map IdP claim values (e.g. Okta groups) to this org + role on first SSO sign-in. Requires{" "}
          <code className="text-xs">OIDC_JIT_ENABLED=true</code>.
        </p>

        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={addRule}>
          <label className="flex flex-col gap-1 text-sm">
            Claim key
            <input
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              value={ruleClaim}
              onChange={(e) => setRuleClaim(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Match value
            <input
              className="min-w-[12rem] rounded border border-zinc-300 px-2 py-1.5 text-sm"
              value={ruleMatch}
              onChange={(e) => setRuleMatch(e.target.value)}
              placeholder="EHS-Plant-A"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Role slug
            <input
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              value={ruleRole}
              onChange={(e) => setRuleRole(e.target.value)}
            />
          </label>
          <button type="submit" className={dfSecondaryOutline} disabled={upsertRule.isPending}>
            Add rule
          </button>
        </form>

        <ul className="mt-4 divide-y divide-zinc-100 text-sm">
          {(rules.data ?? []).length === 0 ? (
            <li className="py-2 text-zinc-600">No JIT rules — falls back to env default org if set.</li>
          ) : (
            rules.data?.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <code className="text-xs">{r.claimKey}</code> ={" "}
                  <strong>{r.matchValue}</strong> → role <code className="text-xs">{r.roleSlug}</code>
                  {!r.enabled ? " (disabled)" : null}
                </span>
                <button
                  type="button"
                  className="text-xs text-red-800 underline"
                  onClick={() => deleteRule.mutate({ organizationId, id: r.id })}
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
