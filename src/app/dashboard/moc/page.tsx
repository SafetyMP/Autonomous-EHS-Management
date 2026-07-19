"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { trpc } from "@/trpc/react";

const MOC_STATUSES = ["draft", "under_review", "approved", "implemented", "closed"] as const;
const MOC_TRIGGERS = [
  "process",
  "product",
  "obligation",
  "knowledge",
  "supplier",
  "organization",
  "disruption",
  "other",
] as const;

function formatDue(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

export default function MocPage() {
  const { organizationId } = useOrg();
  const org = organizationId!;
  const utils = trpc.useUtils();

  const mocs = trpc.program.listMOC.useQuery({ organizationId: org }, { enabled: !!organizationId });
  const links = trpc.program.listMocEntityLinks.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );

  const createMoc = trpc.program.createMOC.useMutation({
    onSuccess: () => void mocs.refetch(),
  });
  const updateMoc = trpc.program.updateMOC.useMutation({
    onSuccess: () => {
      void utils.program.listMOC.invalidate();
      setEditMocId("");
    },
  });
  const updateStatus = trpc.program.updateMOCStatus.useMutation({
    onSuccess: () => void utils.program.listMOC.invalidate(),
  });

  const [mocTitle, setMocTitle] = useState("");
  const [mocDesc, setMocDesc] = useState("");
  const [ohSafety, setOhSafety] = useState(false);
  const [envImpact, setEnvImpact] = useState(false);
  const [trigger, setTrigger] = useState<(typeof MOC_TRIGGERS)[number] | "">("");
  const [aspectsReviewed, setAspectsReviewed] = useState(false);
  const [obligationsReviewed, setObligationsReviewed] = useState(false);
  const [controlsUpdated, setControlsUpdated] = useState(false);
  const [postReviewDue, setPostReviewDue] = useState("");
  const [filterMocId, setFilterMocId] = useState("");

  const [editMocId, setEditMocId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editOhSafety, setEditOhSafety] = useState(false);
  const [editEnvImpact, setEditEnvImpact] = useState(false);
  const [editTrigger, setEditTrigger] = useState<(typeof MOC_TRIGGERS)[number] | "">("");
  const [editAspectsReviewed, setEditAspectsReviewed] = useState(false);
  const [editObligationsReviewed, setEditObligationsReviewed] = useState(false);
  const [editControlsUpdated, setEditControlsUpdated] = useState(false);
  const [editPostReviewDue, setEditPostReviewDue] = useState("");

  const filteredLinks = useMemo(() => {
    const rows = links.data ?? [];
    if (!filterMocId) return rows;
    return rows.filter((l) => l.mocId === filterMocId);
  }, [links.data, filterMocId]);

  function beginEdit(m: {
    id: string;
    title: string;
    description: string;
    ohSafetyImpact: boolean;
    environmentalImpactFlag: boolean;
    changeTrigger: string | null;
    aspectsReviewed: boolean;
    obligationsReviewed: boolean;
    controlsUpdated: boolean;
    postImplementationReviewDue: Date | string | null;
  }) {
    setEditMocId(m.id);
    setEditTitle(m.title);
    setEditDesc(m.description);
    setEditOhSafety(m.ohSafetyImpact);
    setEditEnvImpact(m.environmentalImpactFlag);
    setEditTrigger((m.changeTrigger as (typeof MOC_TRIGGERS)[number] | null) ?? "");
    setEditAspectsReviewed(m.aspectsReviewed);
    setEditObligationsReviewed(m.obligationsReviewed);
    setEditControlsUpdated(m.controlsUpdated);
    setEditPostReviewDue(formatDue(m.postImplementationReviewDue).replace("—", ""));
  }

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Management of change</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Management of change</h1>
          <p className={dfMuted}>
            MOC register with ISO 14001:2026 Clause 6.3–style planning fields.{" "}
            <Link href="/dashboard/program" className="font-medium text-emerald-900 underline">
              Program overview
            </Link>
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        Transition programme aid only — Clause 6.3 planning fields support planned EMS changes. Not
        a certification body determination (ISO 14001:2026 published 2026-04-15; CB transition
        ~2029). See docs/regulatory/iso-14001-2026-transition.md.
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={dfSectionHeading}>New MOC</h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createMoc.mutate({
              organizationId,
              title: mocTitle,
              description: mocDesc,
              ohSafetyImpact: ohSafety,
              environmentalImpactFlag: envImpact,
              changeTrigger: trigger || null,
              aspectsReviewed,
              obligationsReviewed,
              controlsUpdated,
              postImplementationReviewDue: postReviewDue ? new Date(postReviewDue) : null,
            });
            setMocTitle("");
            setMocDesc("");
            setOhSafety(false);
            setEnvImpact(false);
            setTrigger("");
            setAspectsReviewed(false);
            setObligationsReviewed(false);
            setControlsUpdated(false);
            setPostReviewDue("");
          }}
        >
          <input
            required
            placeholder="Title"
            className={dfControl}
            value={mocTitle}
            onChange={(e) => setMocTitle(e.target.value)}
          />
          <textarea
            required
            rows={3}
            placeholder="Description of change"
            className={dfControl}
            value={mocDesc}
            onChange={(e) => setMocDesc(e.target.value)}
          />
          <label className={`${dfLabel} block`}>
            Change trigger (ISO 14001:2026 §6.3 programme aid)
            <select
              className={`${dfControl} mt-1`}
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as (typeof MOC_TRIGGERS)[number] | "")}
            >
              <option value="">Select…</option>
              {MOC_TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={ohSafety}
                onChange={(e) => setOhSafety(e.target.checked)}
              />
              OH&amp;S impact
            </label>
            <label className="inline-flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={envImpact}
                onChange={(e) => setEnvImpact(e.target.checked)}
              />
              Environmental impact
            </label>
            <label className="inline-flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={aspectsReviewed}
                onChange={(e) => setAspectsReviewed(e.target.checked)}
              />
              Aspects reviewed
            </label>
            <label className="inline-flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={obligationsReviewed}
                onChange={(e) => setObligationsReviewed(e.target.checked)}
              />
              Obligations reviewed
            </label>
            <label className="inline-flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={controlsUpdated}
                onChange={(e) => setControlsUpdated(e.target.checked)}
              />
              Controls updated
            </label>
          </div>
          <label className={`${dfLabel} block`}>
            Post-implementation review due
            <input
              type="date"
              className={`${dfControl} mt-1`}
              value={postReviewDue}
              onChange={(e) => setPostReviewDue(e.target.value)}
            />
          </label>
          <button type="submit" disabled={createMoc.isPending} className={dfPrimarySubmit}>
            Create MOC
          </button>
        </form>
      </section>

      {editMocId ? (
        <section className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-6">
          <h2 className={dfSectionHeading}>Edit Clause 6.3 planning fields</h2>
          <form
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              updateMoc.mutate({
                organizationId,
                mocId: editMocId,
                title: editTitle,
                description: editDesc,
                ohSafetyImpact: editOhSafety,
                environmentalImpactFlag: editEnvImpact,
                changeTrigger: editTrigger || null,
                aspectsReviewed: editAspectsReviewed,
                obligationsReviewed: editObligationsReviewed,
                controlsUpdated: editControlsUpdated,
                postImplementationReviewDue: editPostReviewDue
                  ? new Date(editPostReviewDue)
                  : null,
              });
            }}
          >
            <input
              required
              className={dfControl}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <textarea
              required
              rows={3}
              className={dfControl}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
            <label className={`${dfLabel} block`}>
              Change trigger
              <select
                className={`${dfControl} mt-1`}
                value={editTrigger}
                onChange={(e) =>
                  setEditTrigger(e.target.value as (typeof MOC_TRIGGERS)[number] | "")
                }
              >
                <option value="">Select…</option>
                {MOC_TRIGGERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={editOhSafety}
                  onChange={(e) => setEditOhSafety(e.target.checked)}
                />
                OH&amp;S impact
              </label>
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={editEnvImpact}
                  onChange={(e) => setEditEnvImpact(e.target.checked)}
                />
                Environmental impact
              </label>
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={editAspectsReviewed}
                  onChange={(e) => setEditAspectsReviewed(e.target.checked)}
                />
                Aspects reviewed
              </label>
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={editObligationsReviewed}
                  onChange={(e) => setEditObligationsReviewed(e.target.checked)}
                />
                Obligations reviewed
              </label>
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={editControlsUpdated}
                  onChange={(e) => setEditControlsUpdated(e.target.checked)}
                />
                Controls updated
              </label>
            </div>
            <label className={`${dfLabel} block`}>
              Post-implementation review due
              <input
                type="date"
                className={`${dfControl} mt-1`}
                value={editPostReviewDue}
                onChange={(e) => setEditPostReviewDue(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={updateMoc.isPending} className={dfPrimarySubmit}>
                Save MOC
              </button>
              <button
                type="button"
                className={dfSecondaryOutline}
                onClick={() => setEditMocId("")}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className={dfSectionHeading}>MOC register</h2>
          <ul className="mt-2 divide-y rounded-lg border border-zinc-200 bg-white text-sm">
            {mocs.data?.length === 0 ? (
              <li className="px-4 py-3 text-zinc-700">No MOC records yet.</li>
            ) : (
              mocs.data?.map((m) => (
                <li key={m.id} className="space-y-2 px-4 py-3">
                  <button
                    type="button"
                    className="text-left font-medium text-emerald-900 underline"
                    onClick={() => setFilterMocId(m.id === filterMocId ? "" : m.id)}
                  >
                    {m.title}
                  </button>
                  <p className={dfHelperXs}>
                    {m.changeTrigger ? `Trigger: ${m.changeTrigger}` : "No trigger set"}
                    {m.environmentalImpactFlag ? " · EMS impact" : ""}
                    {m.ohSafetyImpact ? " · OH&S impact" : ""}
                  </p>
                  <p className={dfHelperXs}>
                    Aspects {m.aspectsReviewed ? "reviewed" : "pending"}
                    {" · "}
                    Obligations {m.obligationsReviewed ? "reviewed" : "pending"}
                    {" · "}
                    Controls {m.controlsUpdated ? "updated" : "pending"}
                    {" · "}
                    Post-impl review due {formatDue(m.postImplementationReviewDue)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={dfSecondaryOutline}
                      onClick={() => beginEdit(m)}
                    >
                      Edit planning fields
                    </button>
                  </div>
                  <label className={`${dfLabel} block`}>
                    Status
                    <select
                      className={`${dfControl} mt-1`}
                      value={m.status}
                      aria-label={`Status for ${m.title}`}
                      onChange={(e) =>
                        updateStatus.mutate({
                          organizationId,
                          mocId: m.id,
                          status: e.target.value as (typeof MOC_STATUSES)[number],
                        })
                      }
                    >
                      {MOC_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              ))
            )}
          </ul>
        </div>

        <div>
          <h2 className={dfSectionHeading}>Entity link browser</h2>
          <p className={`mt-1 ${dfHelperXs}`}>
            {filterMocId
              ? `Links for selected MOC (${filteredLinks.length})`
              : `All links (${filteredLinks.length})`}
          </p>
          <ul className="mt-2 divide-y rounded-lg border border-zinc-200 bg-white text-sm">
            {filteredLinks.length === 0 ? (
              <li className="px-4 py-3 text-zinc-700">No entity links recorded.</li>
            ) : (
              filteredLinks.map((l) => (
                <li key={`${l.mocId}-${l.entityType}-${l.entityId}`} className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{l.mocTitle}</p>
                  <p className={dfHelperXs}>
                    {l.entityType} · {l.entityId}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
