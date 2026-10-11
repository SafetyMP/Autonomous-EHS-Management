"use client";

import Link from "next/link";
import {
  incidentCapaSpineHoursRule,
  spineFactsFromSavedTrir,
} from "@/lib/dashboard/incidentCapaSpine";
import { trpc } from "@/trpc/react";

const STEPS = [
  { href: "/dashboard/incidents/new", label: "Record an incident" },
  { href: "/dashboard/capa", label: "Link a CAPA" },
  { href: "/dashboard/analytics/incidence-rates", label: "Read TRIR" },
] as const;

const linkClass = "font-medium text-emerald-900 underline underline-offset-2";

/**
 * First job on both dashboard homes: record an incident, link a CAPA, read TRIR.
 * Saved snapshot facts come from the same list query as the incidence-rates page.
 */
export function IncidentCapaSpine({ organizationId }: { organizationId: string }) {
  const calendarYear = new Date().getUTCFullYear();
  const snapshots = trpc.compliance.metrics.listTrirSnapshots.useQuery(
    { organizationId, calendarYear, limit: 1 },
    { retry: false },
  );

  const latest = snapshots.data?.[0];
  const facts = latest
    ? spineFactsFromSavedTrir({
        resultJson: latest.resultJson,
        inputsJson: latest.inputsJson,
      })
    : null;

  return (
    <section
      aria-labelledby="incident-capa-spine-heading"
      className="mb-6 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <h2 id="incident-capa-spine-heading" className="text-lg font-semibold text-zinc-900">
        Incident, CAPA, and TRIR
      </h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-base text-zinc-800">
        {STEPS.map((step) => (
          <li key={step.href}>
            <Link href={step.href} className={linkClass}>
              {step.label}
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-zinc-800">
        Optional AI may suggest wording; a person verifies the CAPA. This software is not an OSHA
        filing tool.
      </p>
      <p className="mt-2 text-sm text-zinc-800">{incidentCapaSpineHoursRule()}</p>
      {facts ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-800">
          <li>{facts.rate}</li>
          <li>{facts.hoursSource}</li>
          <li>{facts.partialCoverage}</li>
        </ul>
      ) : null}
    </section>
  );
}
