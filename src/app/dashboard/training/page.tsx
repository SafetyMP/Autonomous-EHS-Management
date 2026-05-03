"use client";

import { useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfControlMt,
  dfHelperXs,
  dfLabel,
  dfMuted,
  dfPanelHeading,
  dfPrimarySubmit,
  dfTableHead,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

export default function TrainingPage() {
  const { organizationId } = useOrg();
  const utils = trpc.useUtils();
  const [traineeName, setTraineeName] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [completedOn, setCompletedOn] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");

  const { data: records, isLoading } = trpc.training.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const createRecord = trpc.training.create.useMutation({
    onSuccess: () => {
      void utils.training.list.invalidate();
      setTraineeName("");
      setCourseTitle("");
      setCompletedOn("");
      setEvidenceNote("");
    },
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Training</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Training records</h1>
          <p className={dfMuted}>Competence — ISO 45001 / 14001</p>
        </div>
        <OrgSwitcher />
      </div>

      <section
        aria-labelledby="training-add-heading"
        className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <h2 id="training-add-heading" className={dfPanelHeading}>
          Add record
        </h2>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createRecord.mutate({
              organizationId,
              traineeName,
              courseTitle,
              completedOn: completedOn ? new Date(completedOn) : undefined,
              evidenceNote: evidenceNote || undefined,
            });
          }}
        >
          <div>
            <label className={dfLabel} htmlFor="tr-trainee">
              Trainee name
            </label>
            <input
              id="tr-trainee"
              required
              className={dfControlMt}
              value={traineeName}
              onChange={(e) => setTraineeName(e.target.value)}
            />
          </div>
          <div>
            <label className={dfLabel} htmlFor="tr-course">
              Course title
            </label>
            <input
              id="tr-course"
              required
              className={dfControlMt}
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
            />
          </div>
          <div>
            <label className={dfLabel} htmlFor="tr-date">
              Completed on
            </label>
            <input
              id="tr-date"
              type="date"
              className={dfControlMt}
              value={completedOn}
              onChange={(e) => setCompletedOn(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={dfLabel} htmlFor="tr-note">
              Evidence note (optional)
            </label>
            <input
              id="tr-note"
              className={dfControlMt}
              value={evidenceNote}
              onChange={(e) => setEvidenceNote(e.target.value)}
            />
            <p className={`${dfHelperXs} mt-1`}>
              Link to evidence location or document control ID if applicable.
            </p>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={createRecord.isPending}
              aria-busy={createRecord.isPending}
              className={dfPrimarySubmit}
            >
              {createRecord.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </section>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <caption className="sr-only">
            Training records: trainee, course, and completion date.
          </caption>
          <thead className={dfTableHead}>
            <tr>
              <th scope="col" className="px-4 py-3">
                Trainee
              </th>
              <th scope="col" className="px-4 py-3">
                Course
              </th>
              <th scope="col" className="px-4 py-3">
                Completed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-6">
                  <span role="status" aria-live="polite" className="text-base text-zinc-700">
                    Loading training records…
                  </span>
                </td>
              </tr>
            ) : records?.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-base text-zinc-700">
                  No training records yet.
                </td>
              </tr>
            ) : (
              records?.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.traineeName}</td>
                  <td className="px-4 py-3">{r.courseTitle}</td>
                  <td className="px-4 py-3 text-zinc-800">
                    {r.completedOn ? r.completedOn.toLocaleDateString() : "—"}
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
