"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useOrg } from "@/components/org-context";
import {
  dfControlMt,
  dfLabel,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { OrgSwitcher } from "@/components/org-switcher";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";
import { trpc } from "@/trpc/react";

type RouterOutput = inferRouterOutputs<AppRouter>;
type DocRow = RouterOutput["document"]["get"];

function DocumentMetadataForm({
  organizationId,
  doc,
  updateMeta,
}: {
  organizationId: string;
  doc: DocRow;
  updateMeta: {
    mutate: (input: {
      organizationId: string;
      documentId: string;
      title?: string;
      revision?: string;
      effectiveDate?: Date | null;
      evidenceUrl?: string | null;
    }) => void;
    isPending: boolean;
  };
}) {
  const [title, setTitle] = useState(doc.title);
  const [revision, setRevision] = useState(doc.revision);
  const [effectiveDate, setEffectiveDate] = useState(
    doc.effectiveDate ? doc.effectiveDate.toISOString().slice(0, 10) : "",
  );
  const [evidenceUrl, setEvidenceUrl] = useState(doc.evidenceUrl ?? "");

  return (
    <form
      className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const prevEff = doc.effectiveDate
          ? doc.effectiveDate.toISOString().slice(0, 10)
          : "";
        const prevEv = doc.evidenceUrl ?? "";
        updateMeta.mutate({
          organizationId,
          documentId: doc.id,
          title: title !== doc.title ? title : undefined,
          revision: revision !== doc.revision ? revision : undefined,
          effectiveDate:
            effectiveDate !== prevEff
              ? effectiveDate
                ? new Date(effectiveDate)
                : null
              : undefined,
          evidenceUrl: evidenceUrl !== prevEv ? evidenceUrl || null : undefined,
        });
      }}
    >
      <h2 className={dfSectionHeading}>Revision &amp; metadata</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={dfLabel} htmlFor="d-title">
            Title
          </label>
          <input id="d-title" required value={title} onChange={(e) => setTitle(e.target.value)} className={dfControlMt}
          />
        </div>
        <div>
          <label className={dfLabel} htmlFor="d-rev">
            Revision
          </label>
          <input id="d-rev" required value={revision} onChange={(e) => setRevision(e.target.value)} className={dfControlMt}
          />
        </div>
        <div>
          <label className={dfLabel} htmlFor="d-eff">
            Effective date
          </label>
          <input id="d-eff" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)}
            className={dfControlMt}
          />
        </div>
        <div>
          <label className={dfLabel} htmlFor="d-ev">
            Evidence URL (optional)
          </label>
          <input id="d-ev" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} className={dfControlMt}
            placeholder="https://…"
          />
        </div>
      </div>
      <button type="submit" disabled={updateMeta.isPending} aria-busy={updateMeta.isPending} className={dfPrimarySubmit}
      >
        {updateMeta.isPending ? "Saving…" : "Save metadata"}
      </button>
    </form>
  );
}

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = params.documentId as string;
  const { organizationId } = useOrg();
  const utils = trpc.useUtils();

  const { data: doc, isLoading } = trpc.document.get.useQuery(
    {
      organizationId: organizationId!,
      documentId,
    },
    { enabled: !!organizationId && !!documentId },
  );

  const updateMeta = trpc.document.updateMetadata.useMutation({
    onSuccess: () => {
      void utils.document.get.invalidate({ organizationId: organizationId!, documentId });
      void utils.document.list.invalidate();
    },
  });

  const setStatus = trpc.document.setStatus.useMutation({
    onSuccess: () => {
      void utils.document.get.invalidate({ organizationId: organizationId!, documentId });
      void utils.document.list.invalidate();
    },
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Document</h1>
        <OrgSwitcher />
      </div>
    );
  }

  if (isLoading || !doc) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/documents" className="text-sm text-emerald-800 hover:underline">
          ← Documents
        </Link>
        <p
          className={isLoading ? "text-base text-zinc-700" : "text-base text-red-800"}
          role="status"
          aria-live="polite"
        >
          {isLoading ? "Loading…" : "Not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/documents" className="text-sm text-emerald-800 hover:underline">
            ← Documents
          </Link>
          <h1 className="mt-2 text-xl font-semibold">{doc.title}</h1>
          <p className={`font-mono text-sm ${dfMuted}`}>{doc.documentNumber}</p>
        </div>
        <OrgSwitcher />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm shadow-sm">
        <p className="text-zinc-600">
          Status: <span className="font-medium capitalize">{doc.status}</span>
          {doc.approvedAt ? (
            <span className="ml-2 text-zinc-500">
              · Approved {doc.approvedAt.toLocaleDateString()}
            </span>
          ) : null}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {doc.status === "draft" ? (
            <button
              type="button"
              className={dfPrimarySubmit}
              aria-busy={setStatus.isPending}
              disabled={setStatus.isPending}
              onClick={() =>
                setStatus.mutate({
                  organizationId,
                  documentId: doc.id,
                  status: "approved",
                })
              }
            >
              Approve
            </button>
          ) : null}
          {doc.status !== "obsolete" ? (
            <button
              type="button"
              className={dfSecondaryOutline}
              aria-busy={setStatus.isPending}
              disabled={setStatus.isPending}
              onClick={() =>
                setStatus.mutate({
                  organizationId,
                  documentId: doc.id,
                  status: "obsolete",
                })
              }
            >
              Mark obsolete
            </button>
          ) : null}
        </div>
      </div>

      {doc.status === "obsolete" ? (
        <p className="text-sm text-amber-800">
          This document is obsolete; metadata cannot be edited.
        </p>
      ) : (
        <DocumentMetadataForm
          key={`${doc.id}-${doc.updatedAt.toISOString()}`}
          organizationId={organizationId}
          doc={doc}
          updateMeta={updateMeta}
        />
      )}
    </div>
  );
}
