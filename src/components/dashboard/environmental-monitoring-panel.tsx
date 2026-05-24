"use client";

import { useState } from "react";
import {
  dfControl,
  dfHelperXs,
  dfMuted,
  dfPanelHeading,
  dfPrimarySubmit,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

export function EnvironmentalMonitoringPanel({ organizationId }: { organizationId: string }) {
  const utils = trpc.useUtils();
  const { data: rows, isLoading } = trpc.environmentalMonitoring.list.useQuery(
    { organizationId },
    { enabled: !!organizationId },
  );
  const { data: aspects } = trpc.aspect.list.useQuery(
    { organizationId },
    { enabled: !!organizationId },
  );

  const [parameterName, setParameterName] = useState("");
  const [valueText, setValueText] = useState("");
  const [unit, setUnit] = useState("");
  const [aspectId, setAspectId] = useState("");
  const [measuredAt, setMeasuredAt] = useState("");

  const create = trpc.environmentalMonitoring.create.useMutation({
    onSuccess: () => {
      void utils.environmentalMonitoring.list.invalidate({ organizationId });
      setParameterName("");
      setValueText("");
      setUnit("");
      setMeasuredAt("");
    },
  });

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" aria-labelledby="env-monitoring-heading">
      <h2 id="env-monitoring-heading" className={dfPanelHeading}>
        Regulatory monitoring results
      </h2>
      <p className={`mt-1 text-sm ${dfMuted}`}>
        Record parameter readings tied to aspects or permits. Full permit-level entry is available on
        regulatory permit detail pages.
      </p>

      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({
            organizationId,
            environmentalAspectId: aspectId || undefined,
            parameterName,
            valueText,
            unit: unit || undefined,
            measuredAt: measuredAt ? new Date(measuredAt) : new Date(),
          });
        }}
      >
        <label className="text-sm font-semibold text-zinc-900 sm:col-span-2">
          Aspect (optional)
          <select className={dfControl} value={aspectId} onChange={(e) => setAspectId(e.target.value)}>
            <option value="">— None —</option>
            {aspects?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-zinc-900">
          Parameter
          <input required className={dfControl} value={parameterName} onChange={(e) => setParameterName(e.target.value)} />
        </label>
        <label className="text-sm font-semibold text-zinc-900">
          Value
          <input required className={dfControl} value={valueText} onChange={(e) => setValueText(e.target.value)} />
        </label>
        <label className="text-sm font-semibold text-zinc-900">
          Unit
          <input className={dfControl} value={unit} onChange={(e) => setUnit(e.target.value)} />
        </label>
        <label className="text-sm font-semibold text-zinc-900">
          Measured at
          <input
            type="datetime-local"
            className={dfControl}
            value={measuredAt}
            onChange={(e) => setMeasuredAt(e.target.value)}
          />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={create.isPending} className={dfPrimarySubmit}>
            {create.isPending ? "Saving…" : "Record reading"}
          </button>
        </div>
        {create.error ? (
          <p className="text-sm text-red-800 sm:col-span-2" role="alert">
            {create.error.message}
          </p>
        ) : null}
      </form>

      {isLoading ? (
        <p className={`mt-4 ${dfMuted}`} role="status">
          Loading monitoring results…
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-100 text-sm">
          {(rows ?? []).length === 0 ? (
            <li className="py-2 text-zinc-600">No readings recorded yet.</li>
          ) : (
            (rows ?? []).slice(0, 20).map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="font-medium text-zinc-900">
                  {r.parameterName}: {r.valueText}
                  {r.unit ? ` ${r.unit}` : ""}
                </span>
                <time dateTime={r.measuredAt.toISOString()} className={dfHelperXs}>
                  {r.measuredAt.toLocaleString()}
                </time>
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  );
}
