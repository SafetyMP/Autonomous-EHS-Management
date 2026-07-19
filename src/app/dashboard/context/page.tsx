"use client";

import { useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfControl,
  dfHelperXs,
  dfLabel,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import {
  ISO14001_ENVIRONMENTAL_CONDITIONS,
  ISO14001_ENVIRONMENTAL_CONDITION_LABELS,
  type Iso14001EnvironmentalCondition,
} from "@/lib/regulatory/iso14001EnvironmentalConditions";
import { trpc } from "@/trpc/react";

const issueKinds = ["internal", "external"] as const;

export default function ContextPage() {
  const { organizationId } = useOrg();
  const utils = trpc.useUtils();

  const { data: scopes, isLoading: loadingScopes } = trpc.context.listScopes.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );
  const { data: issues } = trpc.context.listIssues.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );
  const { data: parties } = trpc.context.listParties.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );
  const { data: sites } = trpc.organization.sites.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const primaryScope = scopes?.[0];
  const scopeModel = primaryScope
    ? {
        id: primaryScope.id,
        statement: primaryScope.statement,
        coveredSiteIds: primaryScope.coveredSiteIds ?? [],
      }
    : { statement: "", coveredSiteIds: [] as string[], id: undefined as string | undefined };

  const [issueKind, setIssueKind] = useState<(typeof issueKinds)[number]>("internal");
  const [issueCat, setIssueCat] = useState("");
  const [issueDesc, setIssueDesc] = useState("");
  const [envTags, setEnvTags] = useState<Iso14001EnvironmentalCondition[]>([]);
  const createIssue = trpc.context.createIssue.useMutation({
    onSuccess: () => {
      void utils.context.listIssues.invalidate();
      setIssueCat("");
      setIssueDesc("");
      setEnvTags([]);
    },
  });

  function toggleEnvTag(tag: Iso14001EnvironmentalCondition) {
    setEnvTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  const [partyName, setPartyName] = useState("");
  const [partyReq, setPartyReq] = useState("");
  const createParty = trpc.context.createParty.useMutation({
    onSuccess: () => {
      void utils.context.listParties.invalidate();
      setPartyName("");
      setPartyReq("");
    },
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Organization context</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Organization context (Clause 4)</h1>
          <p className={dfMuted}>
            Scope, issues, and interested parties — ISO 14001:2026 environmental conditions supported
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className={dfSectionHeading}>Management system scope</h2>
        <ManagementScopeForm
          key={`${organizationId}-${primaryScope?.id ?? "new"}`}
          organizationId={organizationId}
          scopeModel={scopeModel}
          sites={sites}
          loading={loadingScopes}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className={dfSectionHeading}>Internal / external issues</h2>
          <p className={dfHelperXs}>
            ISO 14001:2026 expects documented consideration of climate, biodiversity, ecosystem
            health, pollution, and natural resources.
          </p>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createIssue.mutate({
                organizationId,
                kind: issueKind,
                category: issueCat,
                description: issueDesc,
                environmentalConditionTags: envTags,
              });
            }}
          >
            <select className={dfControl} value={issueKind} aria-label="Issue kind"
              onChange={(e) => setIssueKind(e.target.value as (typeof issueKinds)[number])}
            >
              {issueKinds.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Category (e.g. workforce, supply chain)"
              className={dfControl}
              value={issueCat}
              onChange={(e) => setIssueCat(e.target.value)}
            />
            <fieldset>
              <legend className={dfLabel}>Environmental conditions (ISO 14001:2026)</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {ISO14001_ENVIRONMENTAL_CONDITIONS.map((tag) => {
                  const selected = envTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`min-h-11 rounded-md border px-3 text-sm ${
                        selected
                          ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                          : "border-zinc-300 bg-white text-zinc-800"
                      }`}
                      aria-pressed={selected}
                      onClick={() => toggleEnvTag(tag)}
                    >
                      {ISO14001_ENVIRONMENTAL_CONDITION_LABELS[tag]}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <textarea
              required
              rows={3}
              placeholder="Description"
              className={dfControl}
              value={issueDesc}
              onChange={(e) => setIssueDesc(e.target.value)}
            />
            <button
              type="submit"
              disabled={createIssue.isPending}
              aria-busy={createIssue.isPending}
              className={dfSecondaryOutline}
            >
              Add issue
            </button>
          </form>
          <ul className="divide-y divide-zinc-100 text-base">
            {issues?.length === 0 ? (
              <li className="py-3 text-zinc-700">No issues recorded.</li>
            ) : (
              issues?.map((i) => (
                <li key={i.id} className="py-3">
                  <span className="font-semibold capitalize text-zinc-900">{i.kind}</span>
                  <span className="text-zinc-800"> · {i.category}</span>
                  {(i.environmentalConditionTags?.length ?? 0) > 0 ? (
                    <p className={`mt-1 ${dfHelperXs}`}>
                      {i.environmentalConditionTags
                        .map((t) =>
                          t in ISO14001_ENVIRONMENTAL_CONDITION_LABELS
                            ? ISO14001_ENVIRONMENTAL_CONDITION_LABELS[
                                t as Iso14001EnvironmentalCondition
                              ]
                            : t,
                        )
                        .join(" · ")}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-zinc-800">{i.description}</p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className={dfSectionHeading}>Interested parties</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createParty.mutate({
                organizationId,
                name: partyName,
                requirementsExpectations: partyReq || undefined,
              });
            }}
          >
            <input
              required
              placeholder="Party name"
              className={dfControl}
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
            />
            <textarea
              rows={2}
              placeholder="Requirements / expectations (optional)"
              className={dfControl}
              value={partyReq}
              onChange={(e) => setPartyReq(e.target.value)}
            />
            <button
              type="submit"
              disabled={createParty.isPending}
              aria-busy={createParty.isPending}
              className={dfSecondaryOutline}
            >
              Add party
            </button>
          </form>
          <ul className="divide-y divide-zinc-100 text-base">
            {parties?.length === 0 ? (
              <li className="py-3 text-zinc-700">No parties recorded.</li>
            ) : (
              parties?.map((p) => (
                <li key={p.id} className="py-3">
                  <p className="font-semibold text-zinc-900">{p.name}</p>
                  {p.requirementsExpectations ? (
                    <p className="mt-1 text-sm text-zinc-800">{p.requirementsExpectations}</p>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function ManagementScopeForm({
  organizationId,
  scopeModel,
  sites,
  loading,
}: {
  organizationId: string;
  scopeModel: { id?: string; statement: string; coveredSiteIds: string[] };
  sites: { id: string; name: string }[] | undefined;
  loading: boolean;
}) {
  const utils = trpc.useUtils();
  const [scopeText, setScopeText] = useState(scopeModel.statement);
  const [siteIds, setSiteIds] = useState(scopeModel.coveredSiteIds);

  const upsertScope = trpc.context.upsertScope.useMutation({
    onSuccess: () => void utils.context.listScopes.invalidate(),
  });

  const toggleSite = (id: string) => {
    setSiteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (loading) {
    return (
      <p className="mt-2 text-base text-zinc-700" role="status" aria-live="polite">
        Loading scope…
      </p>
    );
  }

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        upsertScope.mutate({
          organizationId,
          scopeId: scopeModel.id,
          statement: scopeText,
          coveredSiteIds: siteIds,
        });
      }}
    >
      <textarea
        required
        minLength={10}
        rows={6}
        className={dfControl}
        placeholder="Describe the scope of the EHS management system and sites/processes covered…"
        value={scopeText}
        onChange={(e) => setScopeText(e.target.value)}
      />
      <fieldset className="space-y-2">
        <legend className={`${dfLabel} text-base`}>Sites in scope</legend>
        <div className="flex flex-wrap gap-2">
          {sites?.map((s) => (
            <label
              key={s.id}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-emerald-600"
            >
              <input
                type="checkbox"
                checked={siteIds.includes(s.id)}
                onChange={() => toggleSite(s.id)}
                className="size-4"
              />
              {s.name}
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="submit"
        disabled={upsertScope.isPending}
        aria-busy={upsertScope.isPending}
        className={dfPrimarySubmit}
      >
        Save scope
      </button>
    </form>
  );
}
