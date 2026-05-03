"use client";

import Link from "next/link";
import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfControlMt,
  dfLabel,
  dfMuted,
  dfPanelHeading,
  dfPrimarySubmit,
  dfTableHead,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

type DocRow = inferRouterOutputs<AppRouter>["document"]["list"][number];

const tableBtnBase =
  "touch-target rounded-md px-3 text-base font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50";

export default function DocumentsPage() {
  const { organizationId } = useOrg();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [revision, setRevision] = useState("1.0");
  const [actingDocId, setActingDocId] = useState<string | null>(null);

  const { data: docs, isLoading } = trpc.document.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const createDoc = trpc.document.create.useMutation({
    onSuccess: () => {
      void utils.document.list.invalidate();
      setTitle("");
      setDocumentNumber("");
      setRevision("1.0");
    },
  });

  const setStatus = trpc.document.setStatus.useMutation({
    onSuccess: () => void utils.document.list.invalidate(),
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Controlled documents</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Document control</h1>
          <p className={dfMuted}>
            ISO documented information — draft, approval, obsolescence
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <section aria-labelledby="register-doc-heading">
          <h2 id="register-doc-heading" className={dfPanelHeading}>
            Register document
          </h2>
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              createDoc.mutate({
                organizationId,
                title,
                documentNumber,
                revision: revision || undefined,
              });
            }}
          >
            <div className="min-w-[200px] flex-1">
                <label className={dfLabel} htmlFor="doc-title">
                Title
              </label>
              <input
                id="doc-title"
                required
                className={dfControlMt}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="w-44 min-w-[8rem]">
              <label className={dfLabel} htmlFor="doc-num">
                Number
              </label>
              <input
                id="doc-num"
                required
                className={dfControlMt}
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </div>
            <div className="w-28">
              <label className={dfLabel} htmlFor="doc-rev">
                Rev.
              </label>
              <input
                id="doc-rev"
                className={dfControlMt}
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={createDoc.isPending}
              aria-busy={createDoc.isPending}
              className={dfPrimarySubmit}
            >
              {createDoc.isPending ? "Saving…" : "Add draft"}
            </button>
          </form>
        </section>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <caption className="sr-only">
            Controlled documents with number, title, revision, status, and actions.
          </caption>
          <thead className={dfTableHead}>
            <tr>
              <th scope="col" className="px-4 py-3">
                Number / title
              </th>
              <th scope="col" className="px-4 py-3">
                Rev
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6">
                  <span role="status" aria-live="polite" className="text-base text-zinc-700">
                    Loading documents…
                  </span>
                </td>
              </tr>
            ) : docs?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-base text-zinc-700">
                  No controlled documents yet.
                </td>
              </tr>
            ) : (
              docs?.map((d: DocRow) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-medium text-zinc-800">{d.documentNumber}</span>
                    <p className="font-medium text-zinc-900">
                      <Link
                        href={`/dashboard/documents/${d.id}`}
                        className="rounded-sm text-emerald-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                      >
                        {d.title}
                      </Link>
                    </p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{d.revision}</td>
                  <td className="px-4 py-3 capitalize">{d.status.replace("_", " ")}</td>
                  <td className="space-x-2 px-4 py-3">
                    {d.status === "draft" && (
                      <button
                        type="button"
                        className={`${tableBtnBase} text-emerald-900 decoration-emerald-800 hover:bg-emerald-50`}
                        disabled={setStatus.isPending}
                        aria-busy={actingDocId === d.id}
                        onClick={() => {
                          setActingDocId(d.id);
                          setStatus.mutate(
                            {
                              organizationId,
                              documentId: d.id,
                              status: "approved",
                            },
                            { onSettled: () => setActingDocId(null) },
                          );
                        }}
                      >
                        Approve
                      </button>
                    )}
                    {d.status !== "obsolete" && (
                      <button
                        type="button"
                        className={`${tableBtnBase} text-zinc-900 decoration-zinc-600 hover:bg-zinc-100`}
                        disabled={setStatus.isPending}
                        aria-busy={actingDocId === d.id}
                        onClick={() => {
                          setActingDocId(d.id);
                          setStatus.mutate(
                            {
                              organizationId,
                              documentId: d.id,
                              status: "obsolete",
                            },
                            { onSettled: () => setActingDocId(null) },
                          );
                        }}
                      >
                        Obsolete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
