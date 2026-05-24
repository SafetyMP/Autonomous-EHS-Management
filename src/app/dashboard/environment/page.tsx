"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EnvironmentalMonitoringPanel } from "@/components/dashboard/environmental-monitoring-panel";
import { ObligationEvidencePanel } from "@/components/dashboard/obligation-evidence-panel";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { ASPECT_SIGNIFICANCES } from "@/lib/ehs-enums";
import { RAG_EMBEDDING_DIM } from "@/lib/rag/embeddingDim";
import { trpc } from "@/trpc/react";
import {
  dfAmberGhost,
  dfAmberPrimary,
  dfAmberSecondary,
  dfControl,
  dfControlAmber,
  dfControlMt,
  dfHelperXs,
  dfPanelMinor,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
  dfLabel,
} from "@/lib/dashboard-field-styles";

const significances = ASPECT_SIGNIFICANCES;

export default function EnvironmentPage() {
  const { organizationId } = useOrg();
  const searchParams = useSearchParams();
  const highlightAspectId = searchParams.get("aspect");
  const highlightObligationId = searchParams.get("obligation");
  const utils = trpc.useUtils();

  const { data: aspects, isLoading: loadingAspects } = trpc.aspect.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );
  const { data: obligations, isLoading: loadingOb } =
    trpc.obligation.list.useQuery(
      { organizationId: organizationId! },
      { enabled: !!organizationId },
    );

  const { data: sites } = trpc.organization.sites.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const [aName, setAName] = useState("");
  const [aDesc, setADesc] = useState("");
  const [aSiteId, setASiteId] = useState("");
  const [aActivity, setAActivity] = useState("");
  const [aImpact, setAImpact] = useState("");
  const [aSig, setASig] = useState<string>(significances[1] ?? "medium");
  const [editAspectId, setEditAspectId] = useState("");
  const [editName, setEditName] = useState("");
  const [editActivity, setEditActivity] = useState("");
  const [editImpact, setEditImpact] = useState("");
  const [editSig, setEditSig] = useState<string>(significances[1] ?? "medium");
  const [editDesc, setEditDesc] = useState("");
  const [editSiteId, setEditSiteId] = useState("");
  const [oTitle, setOTitle] = useState("");
  const [oType, setOType] = useState("legal");
  const [oRef, setORef] = useState("");
  const [oNextDue, setONextDue] = useState("");
  const [editObId, setEditObId] = useState("");
  const activeObligationId = editObId || highlightObligationId || "";
  const [editOTitle, setEditOTitle] = useState("");
  const [editOType, setEditOType] = useState("");
  const [editORef, setEditORef] = useState("");
  const [editONext, setEditONext] = useState("");
  const [kbQuery, setKbQuery] = useState("");
  const [aiHint, setAiHint] = useState("");
  const [aspectDraft, setAspectDraft] = useState<{
    name: string;
    activity?: string;
    description?: string;
    environmentalImpact?: string;
    significance: string;
  } | null>(null);

  const updateAspect = trpc.aspect.update.useMutation({
    onSuccess: () => {
      void utils.aspect.list.invalidate();
      setEditAspectId("");
    },
  });
  const createAspect = trpc.aspect.create.useMutation({
    onSuccess: () => {
      void utils.aspect.list.invalidate();
      setAName("");
      setAActivity("");
      setAImpact("");
      setADesc("");
      setASiteId("");
    },
  });
  const updateOb = trpc.obligation.update.useMutation({
    onSuccess: () => {
      void utils.obligation.list.invalidate();
      setEditObId("");
    },
  });
  const createOb = trpc.obligation.create.useMutation({
    onSuccess: () => {
      void utils.obligation.list.invalidate();
      setOTitle("");
      setORef("");
      setONextDue("");
    },
  });

  useEffect(() => {
    if (highlightAspectId && typeof document !== "undefined") {
      document.getElementById(`aspect-${highlightAspectId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightAspectId, aspects]);

  const kbEmbed = trpc.rag.embedQuery.useQuery(
    { organizationId: organizationId!, text: kbQuery.trim() },
    {
      enabled: !!organizationId && kbQuery.trim().length >= 2,
      staleTime: 120_000,
    },
  );

  const kbSearch = trpc.rag.search.useQuery(
    {
      organizationId: organizationId!,
      query: kbQuery,
      limit: 8,
      ...(kbEmbed.data?.embedding &&
      kbEmbed.data.embedding.length === RAG_EMBEDDING_DIM
        ? { queryEmbedding: kbEmbed.data.embedding }
        : {}),
    },
    { enabled: !!organizationId && kbQuery.trim().length >= 2 },
  );

  const draftEmbed = trpc.rag.embedQuery.useQuery(
    { organizationId: organizationId!, text: (aspectDraft?.name ?? "").trim() },
    {
      enabled:
        !!organizationId &&
        !!aspectDraft?.name &&
        aspectDraft.name.trim().length >= 2,
      staleTime: 120_000,
    },
  );

  const draftCitations = trpc.rag.search.useQuery(
    {
      organizationId: organizationId!,
      query: aspectDraft?.name ?? "_",
      limit: 6,
      ...(draftEmbed.data?.embedding &&
      draftEmbed.data.embedding.length === RAG_EMBEDDING_DIM
        ? { queryEmbedding: draftEmbed.data.embedding }
        : {}),
    },
    { enabled: !!organizationId && !!aspectDraft?.name && aspectDraft.name.length >= 2 },
  );

  const suggestAspect = trpc.aiDrafts.suggestAspectDraft.useMutation({
    onSuccess: (res) => setAspectDraft(res.draft),
  });
  const applyAspect = trpc.aiDrafts.applyAspectDraft.useMutation({
    onSuccess: () => {
      void utils.aspect.list.invalidate();
      setAspectDraft(null);
      setAiHint("");
    },
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Environment (ISO 14001)</h1>
        <OrgSwitcher />
      </div>
    );
  }

  const siteLabel = (siteId: string | null) => {
    if (!siteId) return null;
    return sites?.find((s) => s.id === siteId)?.name ?? "Site";
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Environment (ISO 14001)</h1>
        <OrgSwitcher />
      </div>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className={dfSectionHeading}>
            Environmental aspects
          </h2>
          <form
            className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              createAspect.mutate({
                organizationId,
                name: aName,
                significance: aSig as (typeof significances)[number],
                activity: aActivity || undefined,
                environmentalImpact: aImpact || undefined,
                description: aDesc || undefined,
                siteId: aSiteId || undefined,
              });
            }}
          >
            <input
              required
              placeholder="Aspect name"
              value={aName}
              onChange={(e) => setAName(e.target.value)}
              className={dfControl}
            />
            <input
              placeholder="Activity / process (optional)"
              value={aActivity}
              onChange={(e) => setAActivity(e.target.value)}
              className={dfControl}
            />
            <textarea
              placeholder="Environmental impact(s) (optional)"
              rows={2}
              value={aImpact}
              onChange={(e) => setAImpact(e.target.value)}
              className={dfControl}
            />
            <textarea
              placeholder="Description (optional)"
              rows={2}
              value={aDesc}
              onChange={(e) => setADesc(e.target.value)}
              className={dfControl}
            />
            <select
              className={dfControl}
              value={aSiteId}
              onChange={(e) => setASiteId(e.target.value)}
            >
              <option value="">— Site (optional) —</option>
              {sites?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={aSig}
              onChange={(e) => setASig(e.target.value)}
              className={dfControl}
            >
              {significances.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={createAspect.isPending}
              aria-busy={createAspect.isPending}
              className={dfPrimarySubmit}
            >
              Add aspect
            </button>
          </form>
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white text-sm">
            {loadingAspects ? (
              <li className="px-4 py-3 text-base text-zinc-700" role="status" aria-live="polite">
                Loading environmental aspects…
              </li>
            ) : aspects?.length === 0 ? (
              <li className="px-4 py-3 text-base text-zinc-700">No aspects yet.</li>
            ) : (
              aspects?.map((a) => (
                <li
                  key={a.id}
                  id={`aspect-${a.id}`}
                  className={`px-4 py-3 ${highlightAspectId === a.id ? "bg-emerald-50 ring-2 ring-emerald-600 ring-inset" : ""}`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{a.name}</span>
                    <span className="shrink-0 capitalize font-medium text-zinc-800">{a.significance}</span>
                  </div>
                  {a.activity ? (
                    <p className="mt-1 text-xs text-zinc-600">
                      <span className="font-semibold text-zinc-800">Activity:</span> {a.activity}
                    </p>
                  ) : null}
                  {a.environmentalImpact ? (
                    <p className="mt-1 text-xs text-zinc-600">
                      <span className="font-semibold text-zinc-800">Impact:</span>{" "}
                      {a.environmentalImpact}
                    </p>
                  ) : null}
                  {a.description ? (
                    <p className="mt-1 text-xs text-zinc-600">
                      <span className="font-semibold text-zinc-800">Description:</span>{" "}
                      {a.description}
                    </p>
                  ) : null}
                  {siteLabel(a.siteId) ? (
                    <p className="mt-1 text-xs text-zinc-600">
                      <span className="font-semibold text-zinc-800">Site:</span>{" "}
                      {siteLabel(a.siteId)}
                    </p>
                  ) : null}
                </li>
              ))
            )}
          </ul>

          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-4">
            <h3 className={dfPanelMinor}>Update aspect</h3>
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!editAspectId) return;
                updateAspect.mutate({
                  organizationId,
                  aspectId: editAspectId,
                  name: editName,
                  activity: editActivity || null,
                  environmentalImpact: editImpact || null,
                  description: editDesc || null,
                  siteId: editSiteId || null,
                  significance: editSig as (typeof significances)[number],
                });
              }}
            >
              <select
                className={dfControl}
                value={editAspectId}
                onChange={(e) => {
                  const id = e.target.value;
                  setEditAspectId(id);
                  const a = aspects?.find((x) => x.id === id);
                  if (a) {
                    setEditName(a.name);
                    setEditActivity(a.activity ?? "");
                    setEditImpact(a.environmentalImpact ?? "");
                    setEditDesc(a.description ?? "");
                    setEditSiteId(a.siteId ?? "");
                    setEditSig(a.significance);
                  } else {
                    setEditName("");
                    setEditActivity("");
                    setEditImpact("");
                    setEditDesc("");
                    setEditSiteId("");
                    setEditSig(significances[1] ?? "medium");
                  }
                }}
              >
                <option value="">— Select aspect —</option>
                {aspects?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {editAspectId ? (
                <>
                  <input
                    required
                    className={dfControl}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <input
                    placeholder="Activity"
                    className={dfControl}
                    value={editActivity}
                    onChange={(e) => setEditActivity(e.target.value)}
                  />
                  <textarea
                    placeholder="Environmental impact"
                    rows={2}
                    className={dfControl}
                    value={editImpact}
                    onChange={(e) => setEditImpact(e.target.value)}
                  />
                  <textarea
                    placeholder="Description"
                    rows={2}
                    className={dfControl}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                  <select
                    className={dfControl}
                    value={editSiteId}
                    onChange={(e) => setEditSiteId(e.target.value)}
                  >
                    <option value="">— No site —</option>
                    {sites?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className={dfControl}
                    value={editSig}
                    onChange={(e) => setEditSig(e.target.value)}
                  >
                    {significances.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={updateAspect.isPending}
                    aria-busy={updateAspect.isPending}
                    className={dfSecondaryOutline}
                  >
                    Save changes
                  </button>
                </>
              ) : null}
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className={dfSectionHeading}>
            Compliance obligations
          </h2>
          <form
            className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              createOb.mutate({
                organizationId,
                title: oTitle,
                requirementType: oType,
                referenceCode: oRef || undefined,
                nextReviewDue: oNextDue ? new Date(oNextDue) : undefined,
              });
            }}
          >
            <input
              required
              placeholder="Title"
              value={oTitle}
              onChange={(e) => setOTitle(e.target.value)}
              className={dfControl}
            />
            <input
              placeholder="Requirement type (e.g. legal, permit)"
              value={oType}
              onChange={(e) => setOType(e.target.value)}
              className={dfControl}
            />
            <input
              placeholder="Reference code (optional)"
              value={oRef}
              onChange={(e) => setORef(e.target.value)}
              className={dfControl}
            />
            <div>
              <label className={dfLabel} htmlFor="ob-next">
                Next compliance review due (optional)
              </label>
              <input
                id="ob-next"
                type="date"
                value={oNextDue}
                onChange={(e) => setONextDue(e.target.value)}
                className={dfControlMt}
              />
            </div>
            <button
              type="submit"
              disabled={createOb.isPending}
              aria-busy={createOb.isPending}
              className={dfPrimarySubmit}
            >
              Add obligation
            </button>
          </form>
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white text-sm">
            {loadingOb ? (
              <li className="px-4 py-3 text-base text-zinc-700" role="status" aria-live="polite">
                Loading obligations…
              </li>
            ) : obligations?.length === 0 ? (
              <li className="px-4 py-3 text-base text-zinc-700">No obligations yet.</li>
            ) : (
              obligations?.map((o) => (
                <li
                  key={o.id}
                  id={`obligation-${o.id}`}
                  className={`px-4 py-3 ${highlightObligationId === o.id ? "bg-emerald-50 ring-2 ring-emerald-600 ring-inset" : ""}`}
                >
                  <p className="font-medium">{o.title}</p>
                  <p className="text-xs text-zinc-800">
                    {o.requirementType}
                    {o.referenceCode ? ` · ${o.referenceCode}` : ""}
                  </p>
                  {o.nextReviewDue ? (
                    <p className="mt-2 inline-block rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
                      Next review due {o.nextReviewDue.toLocaleDateString()}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-700">No review date set</p>
                  )}
                </li>
              ))
            )}
          </ul>

          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-4">
            <h3 className={dfPanelMinor}>Update obligation</h3>
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!editObId) return;
                const orig = obligations?.find((x) => x.id === editObId);
                if (!orig) return;
                const prevNext = orig.nextReviewDue
                  ? orig.nextReviewDue.toISOString().slice(0, 10)
                  : "";
                let nextReviewDue: Date | null | undefined = undefined;
                if (editONext !== prevNext) {
                  nextReviewDue = editONext ? new Date(editONext) : null;
                }
                updateOb.mutate({
                  organizationId,
                  obligationId: editObId,
                  title: editOTitle !== orig.title ? editOTitle : undefined,
                  requirementType: editOType !== orig.requirementType ? editOType : undefined,
                  referenceCode:
                    editORef !== (orig.referenceCode ?? "")
                      ? editORef || null
                      : undefined,
                  nextReviewDue,
                });
              }}
            >
              <select
                className={dfControl}
                value={editObId || highlightObligationId || ""}
                onChange={(e) => {
                  const id = e.target.value;
                  setEditObId(id);
                  const o = obligations?.find((x) => x.id === id);
                  if (o) {
                    setEditOTitle(o.title);
                    setEditOType(o.requirementType);
                    setEditORef(o.referenceCode ?? "");
                    setEditONext(
                      o.nextReviewDue ? o.nextReviewDue.toISOString().slice(0, 10) : "",
                    );
                  } else {
                    setEditOTitle("");
                    setEditOType("");
                    setEditORef("");
                    setEditONext("");
                  }
                }}
              >
                <option value="">— Select obligation —</option>
                {obligations?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
              {editObId ? (
                <>
                  <input
                    required
                    className={dfControl}
                    value={editOTitle}
                    onChange={(e) => setEditOTitle(e.target.value)}
                  />
                  <input
                    required
                    className={dfControl}
                    value={editOType}
                    onChange={(e) => setEditOType(e.target.value)}
                  />
                  <input
                    className={dfControl}
                    placeholder="Reference code"
                    value={editORef}
                    onChange={(e) => setEditORef(e.target.value)}
                  />
                  <div>
                    <label className={dfLabel} htmlFor="ob-edit-next">
                      Next review due
                    </label>
                    <input
                      id="ob-edit-next"
                      type="date"
                      className={dfControlMt}
                      value={editONext}
                      onChange={(e) => setEditONext(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={updateOb.isPending}
                    aria-busy={updateOb.isPending}
                    className={dfSecondaryOutline}
                  >
                    Save obligation
                  </button>
                </>
              ) : null}
            </form>
            {activeObligationId && organizationId ? (
              <ObligationEvidencePanel
                organizationId={organizationId}
                obligationId={activeObligationId}
                obligationTitle={
                  editOTitle ||
                  obligations?.find((o) => o.id === activeObligationId)?.title ||
                  "Obligation"
                }
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className={dfSectionHeading}>
          Knowledge base (citations)
        </h2>
        <p className={dfHelperXs}>
          Search ingested RAG sources. Results include stable chunk references for traceability.
        </p>
        <input
          placeholder="Search procedures, permits, or registers…"
          value={kbQuery}
          onChange={(e) => setKbQuery(e.target.value)}
          className={dfControl}
        />
        <ul className="divide-y divide-zinc-100 text-sm">
          {kbSearch.isFetching ? (
            <li className="py-2 text-base text-zinc-700" role="status" aria-live="polite">
              Searching knowledge base…
            </li>
          ) : kbQuery.trim().length < 2 ? (
            <li className="py-2 text-base text-zinc-700">Enter at least 2 characters.</li>
          ) : kbSearch.data?.length === 0 ? (
            <li className="py-2 text-base text-zinc-700">No excerpts matched.</li>
          ) : (
            kbSearch.data?.map((row) => (
              <li key={row.chunkId} className="py-2">
                <p className="text-xs font-medium text-emerald-900">{row.citation}</p>
                <p className="mt-1 line-clamp-3 text-xs text-zinc-600">{row.excerpt}</p>
                {row.sourceUri ? (
                  <a
                    href={row.sourceUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-emerald-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                  >
                    Open source
                  </a>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="space-y-4 rounded-lg border border-amber-100 bg-amber-50/40 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900">
          AI-assisted aspect (draft → human apply)
        </h2>
        <p className="text-xs text-amber-950/80">
          The model proposes JSON only. Review citations below, then explicitly apply to the register.
        </p>
        <textarea
          rows={3}
          className={dfControlAmber}
          placeholder='Describe the activity or risk driver, e.g. "new solvent line at Building C"'
          value={aiHint}
          onChange={(e) => setAiHint(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={suggestAspect.isPending || aiHint.trim().length < 3}
            onClick={() =>
              suggestAspect.mutate({ organizationId, contextHint: aiHint })
            }
            className={dfAmberPrimary}
            aria-busy={suggestAspect.isPending}
          >
            Propose draft
          </button>
          {aspectDraft ? (
            <button
              type="button"
              disabled={applyAspect.isPending}
              onClick={() => applyAspect.mutate({ organizationId, draft: aspectDraft })}
              className={dfAmberSecondary}
              aria-busy={applyAspect.isPending}
            >
              Apply draft to register
            </button>
          ) : null}
          {aspectDraft ? (
            <button
              type="button"
              onClick={() => setAspectDraft(null)}
              className={dfAmberGhost}
            >
              Discard draft
            </button>
          ) : null}
        </div>
        {aspectDraft ? (
          <pre className="max-h-40 overflow-auto rounded-md border border-amber-200 bg-white p-3 font-mono text-xs">
            {JSON.stringify(aspectDraft, null, 2)}
          </pre>
        ) : null}
        {aspectDraft ? (
          <div>
            <h3 className="text-xs font-semibold uppercase text-amber-900">Related corpus citations</h3>
            <ul className="mt-2 divide-y divide-amber-100 text-sm">
              {draftCitations.isFetching ? (
                <li className="py-2 text-sm text-amber-900" role="status" aria-live="polite">
                  Loading citations…
                </li>
              ) : draftCitations.data?.length === 0 ? (
                <li className="py-2 text-xs text-amber-800">No RAG excerpts for this draft title.</li>
              ) : (
                draftCitations.data?.map((row) => (
                  <li key={row.chunkId} className="py-2">
                    <p className="text-xs font-medium text-amber-950">{row.citation}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-amber-900/80">{row.excerpt}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </section>

      {organizationId ? <EnvironmentalMonitoringPanel organizationId={organizationId} /> : null}
    </div>
  );
}
