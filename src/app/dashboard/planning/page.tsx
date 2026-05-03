"use client";

import { useState } from "react";
import {
  dfControl,
  dfHelperXs,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { trpc } from "@/trpc/react";

const RISK_RATINGS = ["low", "medium", "high", "very_high"] as const;
const OBJ_TYPES = ["oh_safety", "environmental"] as const;

export default function PlanningPage() {
  const { organizationId } = useOrg();
  const utils = trpc.useUtils();

  const [hTitle, setHTitle] = useState("");
  const [hDesc, setHDesc] = useState("");

  const [rHazardId, setRHazardId] = useState("");
  const [rContext, setRContext] = useState("");
  const [rRating, setRRating] = useState<(typeof RISK_RATINGS)[number]>("medium");

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
  const { data: risks, isLoading: loadingRisks } = trpc.planning.risk.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );
  const { data: objectives, isLoading: loadingObj } =
    trpc.planning.objective.list.useQuery(
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
  const createRisk = trpc.planning.risk.create.useMutation({
    onSuccess: () => {
      void utils.planning.risk.list.invalidate();
      setRContext("");
      setRHazardId("");
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
          <h1 className="text-xl font-semibold">Planning</h1>
          <p className={dfMuted}>Hazards, risk, objectives, operational controls (45001 / 14001)</p>
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
                <li key={h.id} className="px-4 py-3">
                  <span className="font-medium">{h.title}</span>
                  {h.description ? (
                    <p className="mt-1 text-zinc-600">{h.description}</p>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className={dfSectionHeading}>Risk assessments</h2>
          <form
            className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              createRisk.mutate({
                organizationId,
                context: rContext,
                hazardId: rHazardId || undefined,
                residualRating: rRating,
              });
            }}
          >
            <select className={dfControl} value={rHazardId} aria-label="Hazard link (optional)"
              onChange={(e) => setRHazardId(e.target.value)}
            >
              <option value="">— Hazard (optional) —</option>
              {hazards?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title}
                </option>
              ))}
            </select>
            <textarea required minLength={10} placeholder="Context / scenario (min 10 chars)" rows={3} className={dfControl}
              value={rContext}
              onChange={(e) => setRContext(e.target.value)}
            />
            <select className={dfControl} value={rRating} aria-label="Residual risk rating"
              onChange={(e) =>
                setRRating(e.target.value as (typeof RISK_RATINGS)[number])
              }
            >
              {RISK_RATINGS.map((x) => (
                <option key={x} value={x}>
                  {x.replace("_", " ")}
                </option>
              ))}
            </select>
            <button type="submit" disabled={createRisk.isPending} aria-busy={createRisk.isPending} className={dfPrimarySubmit}>
              Record assessment
            </button>
          </form>
          <ul className="divide-y rounded-lg border border-zinc-200 bg-white text-sm">
            {loadingRisks ? (
              <li className="px-4 py-3 text-zinc-700" role="status" aria-live="polite">
                Loading…
              </li>
            ) : risks?.length === 0 ? (
              <li className="px-4 py-3 text-zinc-700">No assessments yet.</li>
            ) : (
              risks?.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <span className={`capitalize ${dfHelperXs}`}>{r.residualRating}</span>
                  <p className="mt-1 whitespace-pre-wrap text-zinc-800">{r.context}</p>
                </li>
              ))
            )}
          </ul>
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
                    {c.hazardId ? "Linked hazard · " : ""}
                    {c.environmentalAspectId ? "Linked aspect" : ""}
                    {!c.hazardId && !c.environmentalAspectId ? "No links" : ""}
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
