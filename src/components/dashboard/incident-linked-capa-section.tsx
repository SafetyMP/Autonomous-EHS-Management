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
  dfSecondaryOutline,
} from "@/lib/dashboard-field-styles";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";
import { trpc } from "@/trpc/react";

type CapaRow = inferRouterOutputs<AppRouter>["capa"]["list"][number];

export function IncidentLinkedCapaSection({
  organizationId,
  incidentId,
  linkedCapas,
  loading = false,
  errorMessage,
  incidentFilter = "",
}: {
  organizationId: string;
  incidentId: string;
  linkedCapas: CapaRow[];
  loading?: boolean;
  errorMessage?: string;
  incidentFilter?: string;
}) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [createdCapa, setCreatedCapa] = useState<{ id: string; title: string } | null>(null);
  const actionHref = (id: string) =>
    `/dashboard/capa/${encodeURIComponent(id)}${incidentFilter ? `?${new URLSearchParams({ incidentFilter })}` : ""}`;

  const createCapa = trpc.capa.create.useMutation({
    onSuccess: (created) => {
      setCreatedCapa(created);
      void utils.capa.list.invalidate({ organizationId });
      setTitle("");
      setDetails("");
      setShowForm(false);
    },
  });

  return (
    <section id="corrective-actions" aria-labelledby="linked-actions-heading" className="scroll-mt-44 sm:scroll-mt-24 rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="linked-actions-heading" className={dfSectionHeading}>Linked corrective actions</h2>
          <p className={`mt-2 ${dfMuted}`}>
            Follow each action from its plan through human verification, keeping this incident as its source.
          </p>
        </div>
        <Link href="/dashboard/capa" className={dfInlineNavLink}>All corrective actions →</Link>
      </div>
      {createdCapa ? (
        <p role="status" className="mt-4 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-foreground">
          Corrective action created. <Link href={actionHref(createdCapa.id)} className={dfInlineNavLink}>Open {createdCapa.title}</Link>
        </p>
      ) : null}
      {loading ? (
        <p className={`mt-4 ${dfMuted}`} role="status">Loading linked corrective actions…</p>
      ) : errorMessage ? (
        <p className="mt-4 text-sm text-red-800" role="alert">Unable to load linked corrective actions: {errorMessage}</p>
      ) : linkedCapas.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border-strong p-4">
          <p className="font-medium text-foreground">No corrective actions linked yet</p>
          <p className={`mt-1 ${dfMuted}`}>Create an action here to carry the investigation findings into follow-up work.</p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {linkedCapas.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <Link href={actionHref(c.id)} className={`${dfInlineNavLink} break-words`}>
                  {c.title}
                </Link>
                <p className={dfHelperXs}>
                  {c.dueDate ? `Due ${new Date(c.dueDate).toLocaleDateString()}` : "No due date assigned"}
                </p>
              </div>
              <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold capitalize text-foreground">
                {c.status.replaceAll("_", " ")}
              </span>
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
              className={dfSecondaryOutline}
              disabled={createCapa.isPending}
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
          onClick={() => {
            createCapa.reset();
            setShowForm(true);
          }}
        >
          Create CAPA from this incident
        </button>
      )}

      <p className={`mt-3 ${dfHelperXs}`}>
        This creates a linked corrective action; it does not close the incident. Open an action to
        manage its owner, progress, evidence, and verification.
      </p>
    </section>
  );
}
