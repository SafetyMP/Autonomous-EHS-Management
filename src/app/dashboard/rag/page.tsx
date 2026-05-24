"use client";

import { useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfControl,
  dfHelperXs,
  dfMuted,
  dfPanelHeading,
  dfPrimarySubmit,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

export default function RagCorpusPage() {
  const { organizationId } = useOrg();
  const utils = trpc.useUtils();

  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [sourceUri, setSourceUri] = useState("");

  const { data: sources, isLoading } = trpc.rag.listSources.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const ingest = trpc.rag.ingest.useMutation({
    onSuccess: () => {
      void utils.rag.listSources.invalidate({ organizationId: organizationId! });
      setTitle("");
      setRawText("");
      setSourceUri("");
    },
  });

  const backfill = trpc.rag.backfillEmbeddings.useMutation({
    onSuccess: () => void utils.rag.listSources.invalidate({ organizationId: organizationId! }),
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Knowledge corpus</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={dfSectionHeading}>Knowledge corpus (RAG)</h1>
          <p className={`mt-1 ${dfMuted}`}>
            Ingest approved text for semantic search on environment and obligation drafting. Requires{" "}
            <code className="text-sm">rag:ingest</code>.
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className={dfPanelHeading}>Ingest source</h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            ingest.mutate({
              organizationId,
              title,
              rawText,
              sourceUri: sourceUri || undefined,
            });
          }}
        >
          <input required placeholder="Title" className={dfControl} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input placeholder="Source URI (optional)" className={dfControl} value={sourceUri} onChange={(e) => setSourceUri(e.target.value)} />
          <textarea required rows={8} placeholder="Raw text" className={dfControl} value={rawText} onChange={(e) => setRawText(e.target.value)} />
          <button type="submit" disabled={ingest.isPending} className={dfPrimarySubmit}>
            {ingest.isPending ? "Ingesting…" : "Ingest & chunk"}
          </button>
          {ingest.error ? (
            <p className="text-sm text-red-800" role="alert">
              {ingest.error.message}
            </p>
          ) : null}
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={dfPanelHeading}>Sources</h2>
          <button
            type="button"
            className={dfPrimarySubmit}
            disabled={backfill.isPending}
            onClick={() => backfill.mutate({ organizationId })}
          >
            {backfill.isPending ? "Backfilling…" : "Backfill embeddings"}
          </button>
        </div>
        {isLoading ? (
          <p className={`mt-3 ${dfMuted}`} role="status">
            Loading sources…
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {(sources ?? []).length === 0 ? (
              <li className="py-2 text-zinc-600">No sources ingested yet.</li>
            ) : (
              (sources ?? []).map((s) => (
                <li key={s.id} className="py-3">
                  <p className="font-medium text-zinc-900">{s.title}</p>
                  <p className={dfHelperXs}>
                    Updated {new Date(s.updatedAt).toLocaleString()}
                    {s.sourceUri ? ` · ${s.sourceUri}` : ""}
                  </p>
                </li>
              ))
            )}
          </ul>
        )}
        {backfill.error ? (
          <p className="mt-2 text-sm text-red-800" role="alert">
            {backfill.error.message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
