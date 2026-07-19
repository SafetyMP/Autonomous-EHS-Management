"use client";

import Link from "next/link";
import { useState } from "react";
import {
  dfControl,
  dfHelperXs,
  dfInlineNavLink,
  dfMuted,
  dfSecondaryOutline,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

export function ObligationEvidencePanel({
  organizationId,
  obligationId,
  obligationTitle,
}: {
  organizationId: string;
  obligationId: string;
  obligationTitle: string;
}) {
  const utils = trpc.useUtils();
  const { data: links, isLoading } = trpc.obligation.listEvidenceLinks.useQuery(
    { organizationId, obligationId },
    { enabled: !!organizationId && !!obligationId },
  );
  const { data: documents } = trpc.document.list.useQuery(
    { organizationId },
    { enabled: !!organizationId },
  );
  const { data: ragSources } = trpc.rag.listSources.useQuery(
    { organizationId },
    { enabled: !!organizationId },
  );

  const [docId, setDocId] = useState("");
  const [ragId, setRagId] = useState("");

  const linkDoc = trpc.obligation.linkEvidenceDocument.useMutation({
    onSuccess: () => {
      void utils.obligation.listEvidenceLinks.invalidate({ organizationId, obligationId });
      setDocId("");
    },
  });
  const linkRag = trpc.obligation.linkEvidenceRagSource.useMutation({
    onSuccess: () => {
      void utils.obligation.listEvidenceLinks.invalidate({ organizationId, obligationId });
      setRagId("");
    },
  });
  const unlink = trpc.obligation.unlinkEvidence.useMutation({
    onSuccess: () =>
      void utils.obligation.listEvidenceLinks.invalidate({ organizationId, obligationId }),
  });

  return (
    <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <h4 className="text-sm font-semibold text-zinc-900">Evidence links — {obligationTitle}</h4>
      <p className={`mt-1 ${dfHelperXs}`}>
        Controlled documents and knowledge corpus sources linked as programme evidence for this
        obligation.
      </p>
      {isLoading ? (
        <p className={`mt-2 ${dfMuted}`} role="status">
          Loading evidence…
        </p>
      ) : (links ?? []).length === 0 ? (
        <p className={`mt-2 text-sm ${dfMuted}`}>No evidence linked yet.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {(links ?? []).map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2">
              {l.href ? (
                <Link href={l.href} className={dfInlineNavLink}>
                  {l.label}
                </Link>
              ) : (
                <span>{l.label}</span>
              )}
              <button
                type="button"
                className="text-xs text-red-800 underline"
                onClick={() =>
                  unlink.mutate({ organizationId, obligationId, linkId: l.id })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!docId) return;
            linkDoc.mutate({ organizationId, obligationId, controlledDocumentId: docId });
          }}
        >
          <div className="min-w-0 flex-1">
            <label className="text-xs font-semibold text-zinc-800">Link document</label>
            <select
              className={`mt-1 ${dfControl}`}
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
            >
              <option value="">Choose…</option>
              {documents?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={!docId || linkDoc.isPending} className={dfSecondaryOutline}>
            Link
          </button>
        </form>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ragId) return;
            linkRag.mutate({ organizationId, obligationId, ragSourceId: ragId });
          }}
        >
          <div className="min-w-0 flex-1">
            <label className="text-xs font-semibold text-zinc-800">Link RAG source</label>
            <select
              className={`mt-1 ${dfControl}`}
              value={ragId}
              onChange={(e) => setRagId(e.target.value)}
            >
              <option value="">Choose…</option>
              {ragSources?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={!ragId || linkRag.isPending} className={dfSecondaryOutline}>
            Link
          </button>
        </form>
      </div>
    </div>
  );
}
