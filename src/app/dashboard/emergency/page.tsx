"use client";

import Link from "next/link";
import { useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfControl,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

export default function EmergencyPrepPage() {
  const { organizationId } = useOrg();
  const org = organizationId!;

  const scenarios = trpc.program.listEmergencyScenarios.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );
  const drills = trpc.program.listEmergencyDrills.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );

  const createScenario = trpc.program.createEmergencyScenario.useMutation({
    onSuccess: () => void scenarios.refetch(),
  });
  const createDrill = trpc.program.createEmergencyDrill.useMutation({
    onSuccess: () => void drills.refetch(),
  });

  const [scName, setScName] = useState("");
  const [drillScenarioId, setDrillScenarioId] = useState("");
  const [drillDate, setDrillDate] = useState("");

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Emergency preparedness</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Emergency preparedness</h1>
          <p className={dfMuted}>
            ISO 45001 / 14001 §8.2 — scenarios and drill log.{" "}
            <Link href="/dashboard/program" className="font-medium text-emerald-900 underline">
              Program overview
            </Link>
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className={dfSectionHeading}>Emergency scenarios</h2>
          <form
            className="mt-3 space-y-2"
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
            <button type="submit" disabled={createScenario.isPending} className={dfSecondaryOutline}>
              Add scenario
            </button>
          </form>
          <ul className={`mt-4 text-base ${dfMuted}`}>
            {scenarios.data?.map((s) => (
              <li key={s.id} className="py-1">
                {s.name}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className={dfSectionHeading}>Emergency drills</h2>
          <form
            className="mt-3 space-y-2"
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
              aria-label="Scenario"
              onChange={(e) => setDrillScenarioId(e.target.value)}
            >
              <option value="">Select scenario…</option>
              {scenarios.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              required
              type="date"
              className={dfControl}
              value={drillDate}
              onChange={(e) => setDrillDate(e.target.value)}
            />
            <button type="submit" disabled={createDrill.isPending} className={dfPrimarySubmit}>
              Record drill
            </button>
          </form>
          <ul className="mt-4 divide-y text-sm">
            {drills.data?.map((d) => (
              <li key={d.id} className="py-2">
                {new Date(d.drillDate).toLocaleDateString()} — scenario {d.scenarioId.slice(0, 8)}…
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
