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

export function ConsultationRecordsPanel({ organizationId }: { organizationId: string }) {
  const utils = trpc.useUtils();
  const { data: rows, isLoading } = trpc.consultation.list.useQuery(
    { organizationId },
    { enabled: !!organizationId },
  );

  const [topic, setTopic] = useState("");
  const [consultedAt, setConsultedAt] = useState("");
  const [outcome, setOutcome] = useState("");

  const create = trpc.consultation.create.useMutation({
    onSuccess: () => {
      void utils.consultation.list.invalidate({ organizationId });
      setTopic("");
      setOutcome("");
      setConsultedAt("");
    },
  });

  return (
    <section
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      aria-labelledby="consultation-records-heading"
    >
      <h2 id="consultation-records-heading" className={dfPanelHeading}>
        Worker consultation records (ISO 45001)
      </h2>
      <p className={`mt-1 text-sm ${dfMuted}`}>
        Document consultation on hazards, objectives, or incidents. Records are audit-logged.
      </p>

      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({
            organizationId,
            topic,
            consultedAt: consultedAt ? new Date(consultedAt) : new Date(),
            outcomeSummary: outcome || undefined,
          });
        }}
      >
        <label className="block text-sm font-semibold text-zinc-900">
          Topic
          <input required minLength={2} className={dfControl} value={topic} onChange={(e) => setTopic(e.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-zinc-900">
          Consulted at
          <input
            type="datetime-local"
            className={dfControl}
            value={consultedAt}
            onChange={(e) => setConsultedAt(e.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold text-zinc-900">
          Outcome summary (optional)
          <textarea rows={3} className={dfControl} value={outcome} onChange={(e) => setOutcome(e.target.value)} />
        </label>
        <button type="submit" disabled={create.isPending} className={dfPrimarySubmit}>
          {create.isPending ? "Saving…" : "Record consultation"}
        </button>
        {create.error ? (
          <p className="text-sm text-red-800" role="alert">
            {create.error.message}
          </p>
        ) : null}
      </form>

      {isLoading ? (
        <p className={`mt-4 ${dfMuted}`} role="status">
          Loading consultation records…
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-100 text-sm">
          {(rows ?? []).length === 0 ? (
            <li className="py-2 text-zinc-600">No consultation records yet.</li>
          ) : (
            (rows ?? []).map((r) => (
              <li key={r.id} className="py-3">
                <p className="font-medium text-zinc-900">{r.topic}</p>
                <p className={dfHelperXs}>{new Date(r.consultedAt).toLocaleString()}</p>
                {r.outcomeSummary ? <p className="mt-1 text-zinc-700">{r.outcomeSummary}</p> : null}
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  );
}
