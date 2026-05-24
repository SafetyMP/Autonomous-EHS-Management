"use client";

import Link from "next/link";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { dfHelperXs, dfInlineNavLink, dfMuted, dfSectionHeading } from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

export default function AssuranceHubPage() {
  const { organizationId } = useOrg();

  const { data: audits } = trpc.internalAudit.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );
  const { data: capas } = trpc.capa.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );
  const { data: cbAudits } = trpc.program.listCbAudits.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );
  const { data: certs } = trpc.program.listCertificates.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const openNcCapas =
    capas?.filter((c) => c.status !== "verified").length ?? 0;

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Assurance hub</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Assurance hub</h1>
          <p className={dfMuted}>
            Internal audit programme, certification body audits, and certificates — distinct from
            transactional{" "}
            <Link href="/dashboard/audit-trail" className={dfInlineNavLink}>
              audit trail
            </Link>
            .
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold tabular-nums text-zinc-900">{audits?.length ?? 0}</p>
          <p className={dfHelperXs}>Internal audits planned or completed</p>
          <Link href="/dashboard/audits" className={`mt-2 inline-block ${dfInlineNavLink}`}>
            Open internal audits →
          </Link>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold tabular-nums text-zinc-900">{openNcCapas}</p>
          <p className={dfHelperXs}>Open corrective actions (not verified)</p>
          <Link href="/dashboard/capa" className={`mt-2 inline-block ${dfInlineNavLink}`}>
            CAPA register →
          </Link>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold tabular-nums text-zinc-900">{certs?.length ?? 0}</p>
          <p className={dfHelperXs}>Management system certificates on file</p>
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={dfSectionHeading}>Certification body audits</h2>
        {cbAudits?.length === 0 ? (
          <p className={`mt-2 ${dfMuted}`}>None recorded — add via program overview or below.</p>
        ) : (
          <ul className="mt-3 divide-y text-sm">
            {cbAudits?.map((a) => (
              <li key={a.id} className="py-3">
                <p className="font-semibold text-zinc-900">{a.certificationBodyName}</p>
                <p className={`mt-1 whitespace-pre-wrap ${dfHelperXs}`}>{a.standardScope}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={dfSectionHeading}>Certificates</h2>
        {certs?.length === 0 ? (
          <p className={`mt-2 ${dfMuted}`}>No certificates registered.</p>
        ) : (
          <ul className="mt-3 divide-y text-sm">
            {certs?.map((c) => (
              <li key={c.id} className="py-3">
                <p className="font-semibold text-zinc-900">
                  {c.standardName} — {c.certificationBodyName}
                </p>
                <p className={`mt-1 ${dfHelperXs}`}>{c.scopeStatement.slice(0, 200)}…</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-zinc-700">
        NC remediation loop: record findings on{" "}
        <Link href="/dashboard/audits" className={dfInlineNavLink}>
          Internal audits
        </Link>
        , create linked CAPA from each finding, then verify effectiveness on the CAPA workspace.
      </p>
    </div>
  );
}
