"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  dfControl,
  dfHelperXs,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { ConsultationRecordsPanel } from "@/components/dashboard/consultation-records-panel";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { trpc } from "@/trpc/react";

const OBJ_TYPES = ["oh_safety", "environmental"] as const;

export default function PlanningPage() {
  const { organizationId } = useOrg();
  const searchParams = useSearchParams();
  const highlightHazardId = searchParams.get("hazard");
  const utils = trpc.useUtils();

  const [hTitle, setHTitle] = useState("");
  const [hDesc, setHDesc] = useState("");

  const [oType, setOType] = useState<(typeof OBJ_TYPES)[number]>("oh_safety");
  const [oTitle, setOTitle] = useState("");
  const [oDesc, setODesc] = useState("");

  const [cTitle, setCTitle] = useState("");
  const [cHazardId, setCHazardId] = useState("");
  const [cAspectId, setCAspectId] = useState("");

  const { data: hazards } = trpc.planning.hazard.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );
  const { data: objectives, isLoading: loadingObj } = trpc.planning.objective.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );
  const { data: controls, isLoading: loadingCtrl } =
    trpc.planning.operationalControl.list.useQuery(
      { organizationId: organizationId! },
      { enabled: !!organizationId },
    );
  const { data: aspects } = trpc.aspect.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const createHazard = trpc.planning.hazard.create.useMutation({
    onSuccess: () => {
      void utils.planning.hazard.list.invalidate();
      setHTitle("");
      setHDesc("");
    },
  });
  const createObjective = trpc.planning.objective.create.useMutation({
    onSuccess: () => {
      void utils.planning.objective.list.invalidate();
      setOTitle("");
      setODesc("");
    },
  });
  const updateObjective = trpc.planning.objective.update.useMutation({
    onSuccess: () => void utils.planning.objective.list.invalidate(),
  });
  const createControl = trpc.planning.operationalControl.create.useMutation({
    onSuccess: () => {
      void utils.planning.operationalControl.list.invalidate();
      setCTitle("");
      setCHazardId("");
      setCAspectId("");
    },
  });

  useEffect(() => {
    if (highlightHazardId && typeof document !== "undefined") {
      document.getElementById(`hazard-${highlightHazardId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightHazardId, hazards]);

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Planning</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Planning hub</h1>
          <p className={dfMuted}>
            Hazards, objectives, and operational controls — linked to risk assessments and environment.{" "}
            <Link href="/dashboard/heat-program" className="font-medium text-emerald-900 underline">
              Heat NEP program aid
            </Link>
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className={dfSectionHeading}>Hazards</h2>
          <form
            className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              createHazard.mutate({
                organizationId,
                title: hTitle,
                description: hDesc || undefined,
              });
            }}
          >
            <input required placeholder="Title" className={dfControl} value={hTitle} onChange={(e) => setHTitle(e.target.value)} />
            <textarea
              placeholder="Description (optional)"
              rows={2}
              className={dfControl}
              value={hDesc}
              onChange={(e) => setHDesc(e.target.value)}
            />
            <button
              type="submit"
              disabled={createHazard.isPending}
              aria-busy={createHazard.isPending}
              className={dfPrimarySubmit}
            >
              Add hazard
            </button>
          </form>
          <ul className="divide-y rounded-lg border border-zinc-200 bg-white text-sm">
            {hazards?.length === 0 ? (
              <li className="px-4 py-3 text-zinc-700">No hazards yet.</li>
            ) : (
              hazards?.map((h) => (
                <li
                  key={h.id}
                  id={`hazard-${h.id}`}
                  className={`px-4 py-3 ${highlightHazardId === h.id ? "bg-emerald-50 ring-2 ring-emerald-600 ring-inset" : ""}`}
                >
                  <span className="font-medium">{h.title}</span>
                  {h.description ? (
                    <p className="mt-1 text-zinc-600">{h.description}</p>
                  ) : null}
                  <p className="mt-2">
                    <Link
                      href={`/dashboard/risk-assessments?hazard=${h.id}`}
                      className="text-sm font-medium text-emerald-900 underline underline-offset-2"
                    >
                      Risk assessments for this hazard →
                    </Link>
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className={dfSectionHeading}>Risk assessments</h2>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-sm text-zinc-800">
            <p>
              Task- and site-based risk assessments with JSA steps, review dates, and audit trail live
              in the dedicated roster — not on this planning page.
            </p>
            <Link
              href="/dashboard/risk-assessments"
              className="mt-3 inline-flex min-h-11 touch-target items-center rounded-md bg-emerald-800 px-4 py-2 font-semibold text-white hover:bg-emerald-900"
            >
              Open risk assessments →
            </Link>
            <Link
              href="/dashboard/risk-assessments/new"
              className="mt-2 block font-medium text-emerald-900 underline underline-offset-2"
            >
              Create new assessment
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className={dfSectionHeading}>Objectives</h2>
          <form
            className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              createObjective.mutate({
                organizationId,
                type: oType,
                title: oTitle,
                description: oDesc || undefined,
              });
            }}
          >
            <select className={dfControl} value={oType} aria-label="Objective type"
              onChange={(e) =>
                setOType(e.target.value as (typeof OBJ_TYPES)[number])
              }
            >
              {OBJ_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "oh_safety" ? "OH&S" : "Environmental"}
                </option>
              ))}
            </select>
            <input required placeholder="Title" className={dfControl} value={oTitle} onChange={(e) => setOTitle(e.target.value)}
            />
            <textarea placeholder="Description (optional)" rows={2} className={dfControl} value={oDesc}
              onChange={(e) => setODesc(e.target.value)}
            />
            <button type="submit" disabled={createObjective.isPending} aria-busy={createObjective.isPending} className={dfPrimarySubmit}>
              Add objective
            </button>
          </form>
          <ul className="divide-y rounded-lg border border-zinc-200 bg-white text-sm">
            {loadingObj ? (
              <li className="px-4 py-3 text-zinc-700" role="status" aria-live="polite">
                Loading…
              </li>
            ) : objectives?.length === 0 ? (
              <li className="px-4 py-3 text-zinc-700">No objectives yet.</li>
            ) : (
              objectives?.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="font-medium">{o.title}</span>
                    <span className={`ml-2 capitalize ${dfHelperXs}`}>
                      ({o.type.replace("_", " ")} · {o.status})
                    </span>
                  </div>
                  {o.status === "active" ? (
                    <button type="button" className={`text-left underline-offset-2 hover:underline ${dfSecondaryOutline}`}
                      onClick={() =>
                        updateObjective.mutate({
                          organizationId,
                          objectiveId: o.id,
                          status: "achieved",
                        })
                      }
                    >
                      Mark achieved
                    </button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className={dfSectionHeading}>Operational controls</h2>
          <form
            className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              createControl.mutate({
                organizationId,
                title: cTitle,
                hazardId: cHazardId || undefined,
                environmentalAspectId: cAspectId || undefined,
              });
            }}
          >
            <input required placeholder="Title" className={dfControl} value={cTitle} onChange={(e) => setCTitle(e.target.value)}
            />
            <select className={dfControl} value={cHazardId} aria-label="Link hazard (optional)"
              onChange={(e) => setCHazardId(e.target.value)}
            >
              <option value="">— Link hazard (optional) —</option>
              {hazards?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title}
                </option>
              ))}
            </select>
            <select className={dfControl} value={cAspectId} aria-label="Link aspect (optional)"
              onChange={(e) => setCAspectId(e.target.value)}
            >
              <option value="">— Link aspect (optional) —</option>
              {aspects?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={createControl.isPending} aria-busy={createControl.isPending} className={dfPrimarySubmit}>
              Add control
            </button>
          </form>
          <ul className="divide-y rounded-lg border border-zinc-200 bg-white text-sm">
            {loadingCtrl ? (
              <li className="px-4 py-3 text-zinc-700" role="status" aria-live="polite">
                Loading…
              </li>
            ) : controls?.length === 0 ? (
              <li className="px-4 py-3 text-zinc-700">No controls yet.</li>
            ) : (
              controls?.map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <span className="font-medium">{c.title}</span>
                  <p className={dfHelperXs}>
                    {c.hazardId ? (
                      <>
                        Linked hazard ·{" "}
                        <Link
                          href={`/dashboard/planning?hazard=${c.hazardId}`}
                          className="font-medium text-emerald-900 underline"
                        >
                          view
                        </Link>
                        {" · "}
                      </>
                    ) : (
                      ""
                    )}
                    {c.environmentalAspectId ? (
                      <>
                        Linked aspect ·{" "}
                        <Link
                          href={`/dashboard/environment?aspect=${c.environmentalAspectId}`}
                          className="font-medium text-emerald-900 underline"
                        >
                          view
                        </Link>
                      </>
                    ) : null}
                    {!c.hazardId && !c.environmentalAspectId ? "No links" : null}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <ConsultationRecordsPanel organizationId={organizationId} />
    </div>
  );
}
