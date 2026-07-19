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

  const filteredLinks = useMemo(() => {
    const rows = links.data ?? [];
    if (!filterMocId) return rows;
    return rows.filter((l) => l.mocId === filterMocId);
  }, [links.data, filterMocId]);

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
            MOC register with ISO 14001:2026 Clause 6.3 planning fields.{" "}
            <Link href="/dashboard/program" className="font-medium text-emerald-900 underline">
              Program overview
            </Link>
          </p>
        </div>
        <OrgSwitcher />
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
            Change trigger (ISO 14001:2026 §6.3)
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
