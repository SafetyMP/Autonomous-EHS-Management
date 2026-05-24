"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfControl,
  dfHelperXs,
  dfMuted,
  dfPrimarySubmit,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

export default function MocPage() {
  const { organizationId } = useOrg();
  const org = organizationId!;

  const mocs = trpc.program.listMOC.useQuery({ organizationId: org }, { enabled: !!organizationId });
  const links = trpc.program.listMocEntityLinks.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );

  const createMoc = trpc.program.createMOC.useMutation({
    onSuccess: () => void mocs.refetch(),
  });

  const [mocTitle, setMocTitle] = useState("");
  const [mocDesc, setMocDesc] = useState("");
  const [filterMocId, setFilterMocId] = useState("");

  const filteredLinks = useMemo(() => {
    const rows = links.data ?? [];
    if (!filterMocId) return rows;
    return rows.filter((l) => l.mocId === filterMocId);
  }, [links.data, filterMocId]);

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Management of change</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Management of change</h1>
          <p className={dfMuted}>
            MOC register and polymorphic entity links (`moc_entity_link`).{" "}
            <Link href="/dashboard/program" className="font-medium text-emerald-900 underline">
              Program overview
            </Link>
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={dfSectionHeading}>New MOC</h2>
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            createMoc.mutate({
              organizationId,
              title: mocTitle,
              description: mocDesc,
            });
            setMocTitle("");
            setMocDesc("");
          }}
        >
          <input
            required
            placeholder="Title"
            className={dfControl}
            value={mocTitle}
            onChange={(e) => setMocTitle(e.target.value)}
          />
          <textarea
            required
            rows={3}
            placeholder="Description of change"
            className={dfControl}
            value={mocDesc}
            onChange={(e) => setMocDesc(e.target.value)}
          />
          <button type="submit" disabled={createMoc.isPending} className={dfPrimarySubmit}>
            Create MOC
          </button>
        </form>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className={dfSectionHeading}>MOC register</h2>
          <ul className="mt-2 divide-y rounded-lg border border-zinc-200 bg-white text-sm">
            {mocs.data?.length === 0 ? (
              <li className="px-4 py-3 text-zinc-700">No MOC records yet.</li>
            ) : (
              mocs.data?.map((m) => (
                <li key={m.id} className="px-4 py-3">
                  <button
                    type="button"
                    className="text-left font-medium text-emerald-900 underline"
                    onClick={() => setFilterMocId(m.id === filterMocId ? "" : m.id)}
                  >
                    {m.title}
                  </button>
                  <p className={`mt-1 capitalize ${dfHelperXs}`}>{m.status.replaceAll("_", " ")}</p>
                </li>
              ))
            )}
          </ul>
        </div>

        <div>
          <h2 className={dfSectionHeading}>Entity link browser</h2>
          <p className={`mt-1 ${dfHelperXs}`}>
            {filterMocId
              ? `Links for selected MOC (${filteredLinks.length})`
              : `All links (${filteredLinks.length})`}
          </p>
          <ul className="mt-2 divide-y rounded-lg border border-zinc-200 bg-white text-sm">
            {filteredLinks.length === 0 ? (
              <li className="px-4 py-3 text-zinc-700">No entity links recorded.</li>
            ) : (
              filteredLinks.map((l) => (
                <li key={`${l.mocId}-${l.entityType}-${l.entityId}`} className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{l.mocTitle}</p>
                  <p className={dfHelperXs}>
                    {l.entityType} · {l.entityId}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
