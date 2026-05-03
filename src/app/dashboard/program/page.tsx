"use client";

import { useState, type ReactNode } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfControl,
  dfControlFlexible,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

const partyTypes = ["contractor", "visitor", "temporary_worker"] as const;

export default function ProgramPage() {
  const { organizationId } = useOrg();
  const org = organizationId!;

  const parties = trpc.program.listExternalParties.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );
  const scenarios = trpc.program.listEmergencyScenarios.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );
  const drills = trpc.program.listEmergencyDrills.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );
  const mocs = trpc.program.listMOC.useQuery({ organizationId: org }, { enabled: !!organizationId });
  const cbAudits = trpc.program.listCbAudits.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );
  const certs = trpc.program.listCertificates.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );
  const kpis = trpc.program.listKpis.useQuery({ organizationId: org }, { enabled: !!organizationId });
  const measures = trpc.program.listMeasurements.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );

  const createParty = trpc.program.createExternalParty.useMutation({
    onSuccess: () => void parties.refetch(),
  });
  const createScenario = trpc.program.createEmergencyScenario.useMutation({
    onSuccess: () => void scenarios.refetch(),
  });
  const createDrill = trpc.program.createEmergencyDrill.useMutation({
    onSuccess: () => void drills.refetch(),
  });
  const createMoc = trpc.program.createMOC.useMutation({
    onSuccess: () => void mocs.refetch(),
  });
  const createCb = trpc.program.createCbAudit.useMutation({
    onSuccess: () => void cbAudits.refetch(),
  });
  const createCert = trpc.program.createCertificate.useMutation({
    onSuccess: () => void certs.refetch(),
  });
  const createKpi = trpc.program.createKpi.useMutation({
    onSuccess: () => void kpis.refetch(),
  });
  const createMeasure = trpc.program.createMeasurement.useMutation({
    onSuccess: () => void measures.refetch(),
  });

  const [partyType, setPartyType] = useState<(typeof partyTypes)[number]>("contractor");
  const [partyName, setPartyName] = useState("");
  const [scName, setScName] = useState("");
  const [drillScenarioId, setDrillScenarioId] = useState("");
  const [drillDate, setDrillDate] = useState("");
  const [mocTitle, setMocTitle] = useState("");
  const [mocDesc, setMocDesc] = useState("");
  const [cbName, setCbName] = useState("");
  const [cbScope, setCbScope] = useState("");
  const [certStd, setCertStd] = useState("");
  const [certCb, setCertCb] = useState("");
  const [certScope, setCertScope] = useState("");
  const [kpiName, setKpiName] = useState("");
  const [measVal, setMeasVal] = useState("");
  const [measUnit, setMeasUnit] = useState("");

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">ISO program areas</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Program register</h1>
          <p className={dfMuted}>
            Contractors, emergency readiness, MOC, CB audits, certificates, KPIs, and measurements
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <Block title="External parties (8.1.4)">
        <form
          className="mb-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            createParty.mutate({
              organizationId,
              partyType,
              companyName: partyName,
            });
            setPartyName("");
          }}
        >
          <select
            className={`sm:max-w-xs ${dfControlFlexible}`}
            value={partyType}
            aria-label="External party type"
            onChange={(e) => setPartyType(e.target.value as (typeof partyTypes)[number])}
          >
            {partyTypes.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Company name"
            className={`min-w-[12rem] flex-1 ${dfControlFlexible}`}
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
          />
          <button
            type="submit"
            disabled={createParty.isPending}
            aria-busy={createParty.isPending}
            className={dfPrimarySubmit}
          >
            Add
          </button>
        </form>
        <ul className="divide-y divide-zinc-100 text-base text-zinc-800">
          {parties.data?.map((p) => (
            <li key={p.id} className="py-2">
              <span className={`capitalize ${dfMuted}`}>{p.partyType}:</span> {p.companyName}
            </li>
          ))}
        </ul>
      </Block>

      <div className="grid gap-6 lg:grid-cols-2">
        <Block title="Emergency scenarios">
          <form className="mb-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              createScenario.mutate({ organizationId, name: scName });
              setScName("");
            }}
          >
            <input
              required
              placeholder="Scenario name"
              className={dfControl}
              value={scName}
              onChange={(e) => setScName(e.target.value)}
            />
            <button type="submit" disabled={createScenario.isPending} aria-busy={createScenario.isPending} className={dfSecondaryOutline}>
              Add scenario
            </button>
          </form>
          <ul className={`text-base ${dfMuted}`}>
            {scenarios.data?.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        </Block>

        <Block title="Emergency drills">
          <form className="mb-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!drillScenarioId || !drillDate) return;
              createDrill.mutate({
                organizationId,
                scenarioId: drillScenarioId,
                drillDate: new Date(drillDate),
              });
              setDrillDate("");
            }}
          >
            <select
              required
              className={dfControl}
              value={drillScenarioId}
              aria-label="Drill scenario"
              onChange={(e) => setDrillScenarioId(e.target.value)}
            >
              <option value="">— Scenario —</option>
              {scenarios.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input required type="date" className={dfControl}
              value={drillDate}
              onChange={(e) => setDrillDate(e.target.value)}
            />
            <button type="submit" disabled={createDrill.isPending} aria-busy={createDrill.isPending} className={dfSecondaryOutline}>
              Log drill
            </button>
          </form>
          <ul className="text-base text-zinc-800">
            {drills.data?.map((d) => {
              const sc = scenarios.data?.find((s) => s.id === d.scenarioId);
              return (
                <li key={d.id}>
                  {d.drillDate.toLocaleDateString()}
                  {sc ? ` · ${sc.name}` : ""}
                </li>
              );
            })}
          </ul>
        </Block>
      </div>

      <Block title="Management of change">
        <form className="mb-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            createMoc.mutate({
              organizationId,
              title: mocTitle,
              description: mocDesc,
            });
            setMocTitle("");
            setMocDesc("");
          }}
        >
          <input required placeholder="Title" className={dfControl}
            value={mocTitle}
            onChange={(e) => setMocTitle(e.target.value)}
          />
          <textarea required rows={2} placeholder="Description / scope of change" className={dfControl}
            value={mocDesc}
            onChange={(e) => setMocDesc(e.target.value)}
          />
          <button type="submit" disabled={createMoc.isPending} aria-busy={createMoc.isPending} className={dfSecondaryOutline}>
            Create MOC
          </button>
        </form>
        <ul className="text-base text-zinc-800">
          {mocs.data?.map((m) => (
            <li key={m.id}>
              <span className="font-medium">{m.title}</span> — {m.status}
            </li>
          ))}
        </ul>
      </Block>

      <div className="grid gap-6 lg:grid-cols-2">
        <Block title="Certification body audits">
          <form
            className="mb-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              createCb.mutate({
                organizationId,
                certificationBodyName: cbName,
                standardScope: cbScope,
              });
              setCbName("");
              setCbScope("");
            }}
          >
            <input required placeholder="Certification body name" className={dfControl}
              value={cbName}
              onChange={(e) => setCbName(e.target.value)}
            />
            <textarea required rows={2} placeholder="Standard(s) and scope assessed" className={dfControl}
              value={cbScope}
              onChange={(e) => setCbScope(e.target.value)}
            />
            <button type="submit" disabled={createCb.isPending} aria-busy={createCb.isPending} className={dfSecondaryOutline}>
              Add CB audit
            </button>
          </form>
          <ul className="text-base text-zinc-800">
            {cbAudits.data?.map((a) => (
              <li key={a.id}>{a.certificationBodyName}</li>
            ))}
          </ul>
        </Block>

        <Block title="Certificates">
          <form className="mb-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              createCert.mutate({
                organizationId,
                standardName: certStd,
                certificationBodyName: certCb,
                scopeStatement: certScope,
              });
              setCertStd("");
              setCertCb("");
              setCertScope("");
            }}
          >
            <input
              required
              placeholder="Standard (e.g. ISO 14001:2015)"
              className={dfControl}
              value={certStd}
              onChange={(e) => setCertStd(e.target.value)}
            />
            <input
              required
              placeholder="Certification body"
              className={dfControl}
              value={certCb}
              onChange={(e) => setCertCb(e.target.value)}
            />
            <textarea
              required
              rows={2}
              placeholder="Certificate scope statement"
              className={dfControl}
              value={certScope}
              onChange={(e) => setCertScope(e.target.value)}
            />
            <button
              type="submit"
              disabled={createCert.isPending}
              aria-busy={createCert.isPending}
              className={dfSecondaryOutline}
            >
              Add certificate
            </button>
          </form>
          <ul className="text-base text-zinc-800">
            {certs.data?.map((c) => (
              <li key={c.id}>
                {c.standardName} — {c.certificationBodyName}
              </li>
            ))}
          </ul>
        </Block>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Block title="KPI definitions">
          <form className="mb-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              createKpi.mutate({ organizationId, name: kpiName });
              setKpiName("");
            }}
          >
            <input
              required
              placeholder="KPI name"
              className={`min-w-[10rem] flex-1 ${dfControlFlexible}`}
              value={kpiName}
              onChange={(e) => setKpiName(e.target.value)}
            />
            <button type="submit" disabled={createKpi.isPending} aria-busy={createKpi.isPending} className={dfPrimarySubmit}>
              Add
            </button>
          </form>
          <ul className="text-base text-zinc-800">
            {kpis.data?.map((k) => (
              <li key={k.id}>{k.name}</li>
            ))}
          </ul>
        </Block>

        <Block title="Measurements">
          <form className="mb-3 grid gap-2 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              createMeasure.mutate({
                organizationId,
                measuredAt: new Date(),
                valueNumeric: measVal || undefined,
                unit: measUnit || undefined,
              });
              setMeasVal("");
              setMeasUnit("");
            }}
          >
            <input
              placeholder="Value"
              className={dfControl}
              value={measVal}
              onChange={(e) => setMeasVal(e.target.value)}
            />
            <input placeholder="Unit" className={dfControl}
              value={measUnit}
              onChange={(e) => setMeasUnit(e.target.value)}
            />
            <button type="submit" className={`${dfSecondaryOutline} sm:col-span-2`}>
              Log measurement (now)
            </button>
          </form>
          <ul className="text-base text-zinc-800">
            {measures.data?.slice(0, 12).map((m) => (
              <li key={m.id}>
                {m.measuredAt.toLocaleString()}
                {m.valueNumeric != null ? ` — ${m.valueNumeric}${m.unit ? ` ${m.unit}` : ""}` : ""}
              </li>
            ))}
          </ul>
        </Block>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className={dfSectionHeading}>{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
