"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useId, useState } from "react";
import { useNavigatorOnline } from "@/hooks/useNavigatorOnline";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfLabel,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { enqueueFieldOutbox, isFieldOutboxEnabled } from "@/lib/offline/fieldOutbox";
import { trpc } from "@/trpc/react";

const inputClass =
  "mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm";

export default function InspectionDetailPage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const formId = useId();
  const { organizationId } = useOrg();
  const online = useNavigatorOnline();
  const [outboxStatus, setOutboxStatus] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: row, isLoading } = trpc.inspection.get.useQuery(
    { organizationId: organizationId!, inspectionId },
    { enabled: !!organizationId && !!inspectionId },
  );

  const [titleEdit, setTitleEdit] = useState("");
  const [notesEdit, setNotesEdit] = useState("");

  const update = trpc.inspection.update.useMutation({
    onSuccess: () => void utils.inspection.get.invalidate(),
  });
  const updateStatus = trpc.inspection.updateStatus.useMutation({
    onSuccess: () => {
      void utils.inspection.get.invalidate();
      void utils.inspection.list.invalidate();
    },
  });

  async function queueStatusTransition(
    status: "in_progress" | "completed" | "cancelled" | "scheduled",
  ) {
    if (!organizationId) return;
    if (!online && isFieldOutboxEnabled()) {
      setOutboxStatus(null);
      try {
        await enqueueFieldOutbox({
          procedure: "inspection.updateStatus",
          organizationId,
          payloadJson: JSON.stringify({ organizationId, inspectionId, status }),
        });
        setOutboxStatus("Saved in this browser. It will send when you are back online.");
      } catch {
        setOutboxStatus("Could not queue offline update in this browser.");
      }
      return;
    }
    updateStatus.mutate({ organizationId, inspectionId, status });
  }

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Inspection</h1>
        <OrgSwitcher />
      </div>
    );
  }

  if (isLoading || !row) {
    return (
      <div className="space-y-4">
        <p role="status" aria-live="polite" className="text-zinc-700">
          Loading inspection…
        </p>
        <OrgSwitcher />
      </div>
    );
  }

  const editingTitle = titleEdit || row.title;
  const editingNotes = notesEdit || row.notes || "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-600">
            <Link href="/dashboard/inspections" className="font-medium text-emerald-900 underline">
              Inspections
            </Link>
          </p>
          <h1 className={`mt-1 ${dfSectionHeading}`}>{row.title}</h1>
          <p className={`mt-1 capitalize ${dfMuted}`}>
            {row.inspectionType.replace("_", " ")} · {row.status.replace("_", " ")}
          </p>
        </div>
        <OrgSwitcher />
      </div>

      {outboxStatus ? (
        <p role="status" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {outboxStatus}
        </p>
      ) : null}

      {row.status !== "completed" && row.status !== "cancelled" ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm" aria-labelledby="prog-h">
          <h2 id="prog-h" className="text-base font-semibold text-zinc-900">
            Progress
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {row.status === "scheduled" ? (
              <button
                type="button"
                className={dfPrimarySubmit}
                disabled={updateStatus.isPending}
                onClick={() => void queueStatusTransition("in_progress")}
              >
                Start inspection
              </button>
            ) : null}
            {row.status === "in_progress" ? (
              <>
                <button
                  type="button"
                  className={dfPrimarySubmit}
                  disabled={updateStatus.isPending}
                  onClick={() => void queueStatusTransition("completed")}
                >
                  Mark complete
                </button>
                <button
                  type="button"
                  className={dfSecondaryOutline}
                  disabled={updateStatus.isPending}
                  onClick={() => void queueStatusTransition("cancelled")}
                >
                  Cancel inspection
                </button>
              </>
            ) : null}
            {row.status === "scheduled" ? (
              <button
                type="button"
                className={dfSecondaryOutline}
                disabled={updateStatus.isPending}
                onClick={() => void queueStatusTransition("cancelled")}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Edit record</h2>
        <form
          id={formId}
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate({
              organizationId,
              inspectionId,
              title: editingTitle.trim(),
              notes: editingNotes.trim() || null,
            });
          }}
        >
          <div>
            <label className={dfLabel} htmlFor={`${formId}-title`}>
              Title
            </label>
            <input
              id={`${formId}-title`}
              className={inputClass}
              value={titleEdit || row.title}
              onChange={(e) => setTitleEdit(e.target.value)}
            />
          </div>
          <div>
            <label className={dfLabel} htmlFor={`${formId}-notes`}>
              Notes
            </label>
            <textarea
              id={`${formId}-notes`}
              rows={4}
              className={inputClass}
              value={notesEdit || row.notes || ""}
              onChange={(e) => setNotesEdit(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className={dfPrimarySubmit}
            disabled={update.isPending || row.status === "completed" || row.status === "cancelled"}
            aria-busy={update.isPending}
          >
            Save changes
          </button>
        </form>
      </section>
    </div>
  );
}
