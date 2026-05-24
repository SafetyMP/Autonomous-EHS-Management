"use client";

import Link from "next/link";
import { useState } from "react";
import {
  dfControl,
  dfHelperXs,
  dfInlineNavLink,
  dfMuted,
  dfPrimarySubmit,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";
import { trpc } from "@/trpc/react";

type CapaRow = inferRouterOutputs<AppRouter>["capa"]["list"][number];

export function IncidentLinkedCapaSection({
  organizationId,
  incidentId,
  linkedCapas,
}: {
  organizationId: string;
  incidentId: string;
  linkedCapas: CapaRow[];
}) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [showForm, setShowForm] = useState(false);

  const createCapa = trpc.capa.create.useMutation({
    onSuccess: () => {
      void utils.capa.list.invalidate({ organizationId });
      setTitle("");
      setDetails("");
      setShowForm(false);
    },
  });

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className={dfSectionHeading}>Linked corrective actions</h2>
      {linkedCapas.length === 0 ? (
        <p className={`mt-2 text-base ${dfMuted}`}>None linked yet.</p>
      ) : (
        <ul className="mt-2 list-inside list-disc text-base text-zinc-900">
          {linkedCapas.map((c) => (
            <li key={c.id}>
              <Link href={`/dashboard/capa/${c.id}`} className={dfInlineNavLink}>
                {c.title}
              </Link>{" "}
              ({c.status.replace("_", " ")})
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <form
          className="mt-4 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            createCapa.mutate({
              organizationId,
              incidentId,
              title,
              details: details || undefined,
            });
          }}
        >
          <label className="block text-sm font-semibold text-zinc-900">
            CAPA title
            <input
              required
              minLength={3}
              className={dfControl}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold text-zinc-900">
            Details (optional)
            <textarea
              rows={3}
              className={dfControl}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </label>
          {createCapa.error ? (
            <p className="text-sm text-red-800" role="alert">
              {createCapa.error.message}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={createCapa.isPending} className={dfPrimarySubmit}>
              {createCapa.isPending ? "Creating…" : "Create CAPA from incident"}
            </button>
            <button
              type="button"
              className="touch-target rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className={`mt-3 ${dfPrimarySubmit}`}
          onClick={() => setShowForm(true)}
        >
          Create CAPA from this incident
        </button>
      )}

      <p className={`mt-3 ${dfHelperXs}`}>
        CAPAs created here are linked to this incident for audit traceability. Manage status and
        approvals from{" "}
        <Link href="/dashboard/capa" className={dfInlineNavLink}>
          CAPA
        </Link>
        .
      </p>
    </div>
  );
}
