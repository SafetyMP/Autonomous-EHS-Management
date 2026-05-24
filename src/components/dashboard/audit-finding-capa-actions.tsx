"use client";

import Link from "next/link";
import { useState } from "react";
import {
  dfControl,
  dfHelperXs,
  dfInlineNavLink,
  dfPrimarySubmit,
  dfSecondaryOutline,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

export function AuditFindingCapaActions({
  organizationId,
  findingId,
  findingTitle,
  findingDetails,
  correctiveActionId,
  capaTitleById,
}: {
  organizationId: string;
  findingId: string;
  findingTitle: string;
  findingDetails: string | null;
  correctiveActionId: string | null;
  capaTitleById: Map<string, string>;
}) {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [capaTitle, setCapaTitle] = useState(`CAPA: ${findingTitle}`);
  const [capaDetails, setCapaDetails] = useState(findingDetails ?? "");

  const createCapa = trpc.capa.create.useMutation({
    onSuccess: () => {
      void utils.internalAudit.finding.list.invalidate();
      void utils.capa.list.invalidate();
      setShowForm(false);
    },
  });

  if (correctiveActionId) {
    const title = capaTitleById.get(correctiveActionId) ?? "Corrective action";
    return (
      <p className={`mt-1 ${dfHelperXs}`}>
        Linked CAPA:{" "}
        <Link href={`/dashboard/capa/${correctiveActionId}`} className={dfInlineNavLink}>
          {title}
        </Link>
      </p>
    );
  }

  if (showForm) {
    return (
      <form
        className="mt-2 space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          createCapa.mutate({
            organizationId,
            auditFindingId: findingId,
            title: capaTitle.trim(),
            details: capaDetails.trim() || undefined,
          });
        }}
      >
        <input
          required
          minLength={3}
          className={dfControl}
          value={capaTitle}
          onChange={(e) => setCapaTitle(e.target.value)}
          aria-label="CAPA title"
        />
        <textarea
          rows={2}
          className={dfControl}
          value={capaDetails}
          onChange={(e) => setCapaDetails(e.target.value)}
          placeholder="Details (optional)"
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={createCapa.isPending} className={dfPrimarySubmit}>
            {createCapa.isPending ? "Creating…" : "Create CAPA from finding"}
          </button>
          <button type="button" className={dfSecondaryOutline} onClick={() => setShowForm(false)}>
            Cancel
          </button>
        </div>
        {createCapa.error ? (
          <p className="text-sm text-red-800" role="alert">
            {createCapa.error.message}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <button type="button" className={`mt-1 ${dfSecondaryOutline}`} onClick={() => setShowForm(true)}>
      Create CAPA from finding
    </button>
  );
}
