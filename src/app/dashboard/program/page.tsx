"use client";

import Link from "next/link";
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
  const createKpi = trpc.program.createKpi.useMutation({
    onSuccess: () => void kpis.refetch(),
  });
  const createMeasure = trpc.program.createMeasurement.useMutation({
    onSuccess: () => void measures.refetch(),
  });

  const [partyType, setPartyType] = useState<(typeof partyTypes)[number]>("contractor");
  const [partyName, setPartyName] = useState("");
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
          <h1 className="text-xl font-semibold">Program overview</h1>
          <p className={dfMuted}>
            KPIs, program indicators, and contractors. Dedicated registers:{" "}
            <Link href="/dashboard/emergency" className="font-medium text-emerald-900 underline">
              Emergency prep
            </Link>
            ,{" "}
            <Link href="/dashboard/moc" className="font-medium text-emerald-900 underline">
              MOC
            </Link>
            ,{" "}
            <Link href="/dashboard/assurance" className="font-medium text-emerald-900 underline">
              Assurance hub
            </Link>
            .
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard/emergency"
          className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50"
        >
          <p className="font-semibold text-zinc-900">Emergency preparedness</p>
          <p className={`mt-1 ${dfMuted}`}>{scenarios.data?.length ?? 0} scenarios</p>
        </Link>
        <Link
          href="/dashboard/moc"
          className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50"
        >
          <p className="font-semibold text-zinc-900">Management of change</p>
          <p className={`mt-1 ${dfMuted}`}>{mocs.data?.length ?? 0} MOC records</p>
        </Link>
        <Link
          href="/dashboard/assurance"
          className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50"
        >
          <p className="font-semibold text-zinc-900">Assurance hub</p>
          <p className={`mt-1 ${dfMuted}`}>
            {cbAudits.data?.length ?? 0} CB audits · {certs.data?.length ?? 0} certificates
          </p>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Block title="Program indicators (KPI definitions)">
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

        <Block title="Program indicator measurements">
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
