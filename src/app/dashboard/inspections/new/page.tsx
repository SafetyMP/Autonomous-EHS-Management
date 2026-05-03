"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfLabel,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

const inputClass =
  "mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm";

export default function NewInspectionPage() {
  const router = useRouter();
  const formId = useId();
  const { organizationId } = useOrg();
  const [title, setTitle] = useState("");
  const [inspectionType, setInspectionType] = useState<"routine" | "regulatory" | "pre_job" | "other">(
    "other",
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  const create = trpc.inspection.create.useMutation({
    onSuccess: (row) => {
      void utils.inspection.list.invalidate();
      router.push(`/dashboard/inspections/${row.id}`);
    },
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">New inspection</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={dfSectionHeading}>New inspection</h1>
          <p className={`mt-1 ${dfMuted}`}>
            Schedule a workplace inspection. You can update status and notes from the record page.
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <form
        id={formId}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          let sched: Date | undefined;
          if (scheduledAt.trim()) {
            const d = new Date(`${scheduledAt}T12:00:00`);
            if (!Number.isNaN(d.getTime())) sched = d;
          }
          create.mutate({
            organizationId,
            title: title.trim(),
            inspectionType,
            scheduledAt: sched,
            notes: notes.trim() || null,
          });
        }}
      >
        <div>
          <label className={dfLabel} htmlFor={`${formId}-title`}>
            Title
          </label>
          <input
            id={`${formId}-title`}
            required
            minLength={2}
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className={dfLabel} htmlFor={`${formId}-type`}>
            Type
          </label>
          <select
            id={`${formId}-type`}
            className={inputClass}
            value={inspectionType}
            onChange={(e) =>
              setInspectionType(e.target.value as typeof inspectionType)
            }
          >
            <option value="routine">Routine</option>
            <option value="regulatory">Regulatory</option>
            <option value="pre_job">Pre-job</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={dfLabel} htmlFor={`${formId}-sched`}>
            Scheduled date (optional)
          </label>
          <input
            id={`${formId}-sched`}
            type="date"
            className={inputClass}
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
        <div>
          <label className={dfLabel} htmlFor={`${formId}-notes`}>
            Notes (optional)
          </label>
          <textarea
            id={`${formId}-notes`}
            rows={3}
            className={inputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className={dfPrimarySubmit}
            disabled={create.isPending}
            aria-busy={create.isPending}
          >
            {create.isPending ? "Saving…" : "Create"}
          </button>
          <Link href="/dashboard/inspections" className={dfSecondaryOutline}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
