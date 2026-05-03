"use client";

import Link from "next/link";
import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";
import { trpc } from "@/trpc/react";

type OshaRecordRowNullable =
  inferRouterOutputs<AppRouter>["compliance"]["regulatoryOsha"]["getInjuryIllnessRecord"];
type OshaRecordRow = NonNullable<OshaRecordRowNullable>;
type RefPayload = inferRouterOutputs<AppRouter>["compliance"]["regulatoryOsha"]["recordkeepingReference"];
type EstRow = inferRouterOutputs<AppRouter>["compliance"]["establishment"]["list"][number];
type SubjectRow = inferRouterOutputs<AppRouter>["compliance"]["regulatoryOsha"]["listPersonSubjects"][number];

const inputClass =
  "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm sm:text-sm";
const labelClass = "block text-sm font-medium text-zinc-800";

type FormState = {
  establishmentId: string;
  injuredPersonSubjectId: string;
  oshaRecordable: boolean;
  recordableClassification: string;
  recordkeepingFramework: string;
  recordkeepingStateCode: string;
  stateRuleReference: string;
  jurisdictionNotes: string;
  determinationStatus: string;
  classificationRationale: string;
  workRelatedRationale: string;
  phcpDeterminationSummary: string;
  daysAway: string;
  daysRestricted: string;
  caseNumberEstablishment: string;
  privacyCase: boolean;
  jobTitle: string;
  injuryIllnessCategory: string;
  bodyPart: string;
  objectSubstance: string;
  physicianFacilityNote: string;
};

const emptyForm: FormState = {
  establishmentId: "",
  injuredPersonSubjectId: "",
  oshaRecordable: false,
  recordableClassification: "",
  recordkeepingFramework: "undetermined",
  recordkeepingStateCode: "",
  stateRuleReference: "",
  jurisdictionNotes: "",
  determinationStatus: "draft",
  classificationRationale: "",
  workRelatedRationale: "",
  phcpDeterminationSummary: "",
  daysAway: "",
  daysRestricted: "",
  caseNumberEstablishment: "",
  privacyCase: false,
  jobTitle: "",
  injuryIllnessCategory: "",
  bodyPart: "",
  objectSubstance: "",
  physicianFacilityNote: "",
};

function recordToForm(r: OshaRecordRow): FormState {
  return {
    establishmentId: r.establishmentId ?? "",
    injuredPersonSubjectId: r.injuredPersonSubjectId ?? "",
    oshaRecordable: r.oshaRecordable,
    recordableClassification: r.recordableClassification ?? "",
    recordkeepingFramework: r.recordkeepingFramework ?? "undetermined",
    recordkeepingStateCode: r.recordkeepingStateCode ?? "",
    stateRuleReference: r.stateRuleReference ?? "",
    jurisdictionNotes: r.jurisdictionNotes ?? "",
    determinationStatus: r.determinationStatus ?? "draft",
    classificationRationale: r.classificationRationale ?? "",
    workRelatedRationale: r.workRelatedRationale ?? "",
    phcpDeterminationSummary: r.phcpDeterminationSummary ?? "",
    daysAway: r.daysAway != null ? String(r.daysAway) : "",
    daysRestricted: r.daysRestricted != null ? String(r.daysRestricted) : "",
    caseNumberEstablishment: r.caseNumberEstablishment ?? "",
    privacyCase: r.privacyCase,
    jobTitle: r.jobTitle ?? "",
    injuryIllnessCategory: r.injuryIllnessCategory ?? "",
    bodyPart: r.bodyPart ?? "",
    objectSubstance: r.objectSubstance ?? "",
    physicianFacilityNote: r.physicianFacilityNote ?? "",
  };
}

function OshaInjuryIllnessForm({
  organizationId,
  incidentId,
  record,
  refPayload,
  establishmentRows,
  establishmentError,
  subjectRows,
  subjectError,
}: {
  organizationId: string;
  incidentId: string;
  record: OshaRecordRow | null;
  refPayload: RefPayload | undefined;
  establishmentRows: EstRow[] | undefined;
  establishmentError: boolean;
  subjectRows: SubjectRow[] | undefined;
  subjectError: boolean;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<FormState>(() =>
    record ? recordToForm(record) : emptyForm,
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const upsert = trpc.compliance.regulatoryOsha.upsertInjuryIllnessRecord.useMutation({
    onSuccess: () => {
      setLocalError(null);
      void utils.compliance.regulatoryOsha.getInjuryIllnessRecord.invalidate({
        organizationId,
        incidentId,
      });
    },
    onError: (e) => setLocalError(e.message),
  });

  const ref = refPayload;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    const da = form.daysAway.trim() ? Number(form.daysAway) : null;
    const dr = form.daysRestricted.trim() ? Number(form.daysRestricted) : null;
    if (form.daysAway.trim() && !Number.isFinite(da)) {
      setLocalError("Days away must be a number.");
      return;
    }
    if (form.daysRestricted.trim() && !Number.isFinite(dr)) {
      setLocalError("Days restricted must be a number.");
      return;
    }

    upsert.mutate({
      organizationId,
      incidentId,
      establishmentId: form.establishmentId ? form.establishmentId : null,
      injuredPersonSubjectId: form.injuredPersonSubjectId ? form.injuredPersonSubjectId : null,
      oshaRecordable: form.oshaRecordable,
      recordableClassification: form.recordableClassification
        ? (form.recordableClassification as
            | "death"
            | "days_away"
            | "job_transfer_restriction"
            | "other_recordable")
        : null,
      recordkeepingFramework: form.recordkeepingFramework as
        | "federal_29_cfr_1904"
        | "state_plan"
        | "state_statute_supplement"
        | "undetermined",
      recordkeepingStateCode: form.recordkeepingStateCode || null,
      stateRuleReference: form.stateRuleReference || null,
      jurisdictionNotes: form.jurisdictionNotes || null,
      determinationStatus: form.determinationStatus as "draft" | "under_review" | "determined",
      classificationRationale: form.classificationRationale || null,
      workRelatedRationale: form.workRelatedRationale || null,
      phcpDeterminationSummary: form.phcpDeterminationSummary || null,
      daysAway: da,
      daysRestricted: dr,
      caseNumberEstablishment: form.caseNumberEstablishment || null,
      privacyCase: form.privacyCase,
      jobTitle: form.jobTitle || null,
      injuryIllnessCategory: form.injuryIllnessCategory
        ? (form.injuryIllnessCategory as
            | "injury"
            | "skin_disorder"
            | "respiratory_condition"
            | "poisoning"
            | "hearing_loss"
            | "other_illness")
        : null,
      bodyPart: form.bodyPart || null,
      objectSubstance: form.objectSubstance || null,
      physicianFacilityNote: form.physicianFacilityNote || null,
    });
  }

  const showState =
    form.recordkeepingFramework === "state_plan" ||
    form.recordkeepingFramework === "state_statute_supplement";

  return (
    <>
      <h2 className="text-sm font-semibold text-zinc-800">OSHA injury &amp; illness recordkeeping</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Form 300/301–style fields. Federal 29 CFR Part 1904 is the default national reference; selected
        states operate OSHA-approved plans or parallel rules—document which framework applies.
      </p>

      {ref ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950">
          <p>{ref.disclaimer}</p>
          <p className="mt-2">
            <Link
              href={ref.statePlansUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-900 underline"
            >
              OSHA State Plans directory
            </Link>{" "}
            (verify sector coverage and current requirements).
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer font-medium text-amber-950">Federal summary</summary>
            <ul className="mt-1 list-inside list-disc text-amber-900">
              {ref.federalSummary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
          <details className="mt-2">
            <summary className="cursor-pointer font-medium text-amber-950">
              State-plan highlights (non-exhaustive)
            </summary>
            <ul className="mt-1 max-h-40 overflow-y-auto text-amber-900">
              {ref.statePlanHighlights.map((s) => (
                <li key={s.code}>
                  <strong>{s.code}</strong> — {s.programLabel}: {s.note}
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : null}

      {establishmentError ? (
        <p className="mt-2 text-xs text-zinc-500">
          Establishment list unavailable (establishment:read may be required to link an establishment).
        </p>
      ) : null}

      {localError ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {localError}
        </p>
      ) : null}

      {record?.determinationStatus === "determined" && record.determinedAt ? (
        <p className="mt-3 text-xs text-zinc-600">
          Determination recorded {new Date(record.determinedAt).toLocaleString()}.
        </p>
      ) : null}

      <form onSubmit={submit} className="mt-4 space-y-4 text-sm">
        <div>
          <label htmlFor="osha-fw" className={labelClass}>
            Recordkeeping framework
          </label>
          <select
            id="osha-fw"
            className={inputClass}
            value={form.recordkeepingFramework}
            onChange={(e) =>
              setForm((f) => ({ ...f, recordkeepingFramework: e.target.value }))
            }
          >
            <option value="undetermined">Undetermined / under analysis</option>
            <option value="federal_29_cfr_1904">Federal — 29 CFR Part 1904</option>
            <option value="state_plan">OSHA-approved state plan (primary)</option>
            <option value="state_statute_supplement">State statute / program (supplement or non-plan)</option>
          </select>
        </div>

        {showState ? (
          <div>
            <label htmlFor="osha-st" className={labelClass}>
              US state (postal code)
            </label>
            <select
              id="osha-st"
              className={inputClass}
              value={form.recordkeepingStateCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, recordkeepingStateCode: e.target.value }))
              }
            >
              <option value="">Select state</option>
              {(ref?.usStates ?? []).map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="osha-sr" className={labelClass}>
            State rule reference (optional)
          </label>
          <input
            id="osha-sr"
            className={inputClass}
            value={form.stateRuleReference}
            placeholder="e.g. Cal. Code Regs., Title 8 §…"
            onChange={(e) => setForm((f) => ({ ...f, stateRuleReference: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="osha-jn" className={labelClass}>
            Jurisdiction notes (federal vs state divergence)
          </label>
          <textarea
            id="osha-jn"
            rows={2}
            className={inputClass}
            value={form.jurisdictionNotes}
            onChange={(e) => setForm((f) => ({ ...f, jurisdictionNotes: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="osha-ds" className={labelClass}>
            Determination workflow
          </label>
          <select
            id="osha-ds"
            className={inputClass}
            value={form.determinationStatus}
            onChange={(e) =>
              setForm((f) => ({ ...f, determinationStatus: e.target.value }))
            }
          >
            <option value="draft">Draft</option>
            <option value="under_review">Under review</option>
            <option value="determined">Determined (locks in timestamp for audit trail)</option>
          </select>
        </div>

        <div>
          <label htmlFor="osha-cr" className={labelClass}>
            Recordability &amp; classification rationale
          </label>
          <textarea
            id="osha-cr"
            rows={3}
            className={inputClass}
            value={form.classificationRationale}
            onChange={(e) =>
              setForm((f) => ({ ...f, classificationRationale: e.target.value }))
            }
          />
        </div>

        <div>
          <label htmlFor="osha-wr" className={labelClass}>
            Work-related rationale
          </label>
          <textarea
            id="osha-wr"
            rows={2}
            className={inputClass}
            value={form.workRelatedRationale}
            onChange={(e) =>
              setForm((f) => ({ ...f, workRelatedRationale: e.target.value }))
            }
          />
        </div>

        <div>
          <label htmlFor="osha-ph" className={labelClass}>
            Clinician / PHCP determination summary
          </label>
          <textarea
            id="osha-ph"
            rows={2}
            className={inputClass}
            value={form.phcpDeterminationSummary}
            onChange={(e) =>
              setForm((f) => ({ ...f, phcpDeterminationSummary: e.target.value }))
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-zinc-800">
            <input
              type="checkbox"
              checked={form.oshaRecordable}
              onChange={(e) => setForm((f) => ({ ...f, oshaRecordable: e.target.checked }))}
            />
            OSHA recordable
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-zinc-800">
            <input
              type="checkbox"
              checked={form.privacyCase}
              onChange={(e) => setForm((f) => ({ ...f, privacyCase: e.target.checked }))}
            />
            Privacy case (Form 300)
          </label>
        </div>

        <div>
          <label htmlFor="osha-rc" className={labelClass}>
            Recordable classification
          </label>
          <select
            id="osha-rc"
            className={inputClass}
            value={form.recordableClassification}
            onChange={(e) =>
              setForm((f) => ({ ...f, recordableClassification: e.target.value }))
            }
          >
            <option value="">—</option>
            <option value="death">Death</option>
            <option value="days_away">Days away from work</option>
            <option value="job_transfer_restriction">Job transfer or restriction</option>
            <option value="other_recordable">Other recordable cases</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="osha-da" className={labelClass}>
              Days away
            </label>
            <input
              id="osha-da"
              type="number"
              min={0}
              className={inputClass}
              value={form.daysAway}
              onChange={(e) => setForm((f) => ({ ...f, daysAway: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="osha-dr" className={labelClass}>
              Days restricted / job transfer
            </label>
            <input
              id="osha-dr"
              type="number"
              min={0}
              className={inputClass}
              value={form.daysRestricted}
              onChange={(e) => setForm((f) => ({ ...f, daysRestricted: e.target.value }))}
            />
          </div>
        </div>

        {!establishmentError && establishmentRows ? (
          <div>
            <label htmlFor="osha-est" className={labelClass}>
              Establishment (OSHA reporting unit)
            </label>
            <select
              id="osha-est"
              className={inputClass}
              value={form.establishmentId}
              onChange={(e) =>
                setForm((f) => ({ ...f, establishmentId: e.target.value }))
              }
            >
              <option value="">—</option>
              {establishmentRows.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {!subjectError && subjectRows ? (
          <div>
            <label htmlFor="osha-sub" className={labelClass}>
              Injured person (pseudonym subject)
            </label>
            <select
              id="osha-sub"
              className={inputClass}
              value={form.injuredPersonSubjectId}
              onChange={(e) =>
                setForm((f) => ({ ...f, injuredPersonSubjectId: e.target.value }))
              }
            >
              <option value="">—</option>
              {subjectRows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayPseudonym}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="osha-job" className={labelClass}>
            Job title
          </label>
          <input
            id="osha-job"
            className={inputClass}
            value={form.jobTitle}
            onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="osha-ic" className={labelClass}>
            Injury / illness category
          </label>
          <select
            id="osha-ic"
            className={inputClass}
            value={form.injuryIllnessCategory}
            onChange={(e) =>
              setForm((f) => ({ ...f, injuryIllnessCategory: e.target.value }))
            }
          >
            <option value="">—</option>
            <option value="injury">Injury</option>
            <option value="skin_disorder">Skin disorder</option>
            <option value="respiratory_condition">Respiratory condition</option>
            <option value="poisoning">Poisoning</option>
            <option value="hearing_loss">Hearing loss</option>
            <option value="other_illness">Other illness</option>
          </select>
        </div>

        <div>
          <label htmlFor="osha-bp" className={labelClass}>
            Body part
          </label>
          <textarea
            id="osha-bp"
            rows={2}
            className={inputClass}
            value={form.bodyPart}
            onChange={(e) => setForm((f) => ({ ...f, bodyPart: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="osha-obj" className={labelClass}>
            Object / substance
          </label>
          <textarea
            id="osha-obj"
            rows={2}
            className={inputClass}
            value={form.objectSubstance}
            onChange={(e) => setForm((f) => ({ ...f, objectSubstance: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="osha-md" className={labelClass}>
            Treatment facility / clinician notes (sensitive)
          </label>
          <textarea
            id="osha-md"
            rows={2}
            className={inputClass}
            value={form.physicianFacilityNote}
            onChange={(e) =>
              setForm((f) => ({ ...f, physicianFacilityNote: e.target.value }))
            }
          />
        </div>

        <div>
          <label htmlFor="osha-cn" className={labelClass}>
            Establishment case number
          </label>
          <input
            id="osha-cn"
            className={inputClass}
            value={form.caseNumberEstablishment}
            onChange={(e) =>
              setForm((f) => ({ ...f, caseNumberEstablishment: e.target.value }))
            }
          />
        </div>

        <button
          type="submit"
          disabled={upsert.isPending}
          className="min-h-11 touch-target rounded-md bg-emerald-800 px-4 py-2 text-base font-semibold text-white disabled:opacity-60"
        >
          {upsert.isPending ? "Saving…" : "Save OSHA record"}
        </button>
      </form>
    </>
  );
}

export function OshaInjuryIllnessSection({
  organizationId,
  incidentId,
}: {
  organizationId: string;
  incidentId: string;
}) {
  const refQuery = trpc.compliance.regulatoryOsha.recordkeepingReference.useQuery();
  const recordQuery = trpc.compliance.regulatoryOsha.getInjuryIllnessRecord.useQuery(
    { organizationId, incidentId },
    { enabled: !!organizationId && !!incidentId, retry: false },
  );

  const establishments = trpc.compliance.establishment.list.useQuery(
    { organizationId },
    { enabled: !!organizationId, retry: false },
  );
  const subjects = trpc.compliance.regulatoryOsha.listPersonSubjects.useQuery(
    { organizationId },
    { enabled: !!organizationId, retry: false },
  );

  if (recordQuery.isError) {
    const msg = recordQuery.error.message ?? "";
    if (/forbidden|not a member|permission/i.test(msg)) {
      return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          <p className="font-medium text-zinc-800">OSHA injury &amp; illness record (Form 300/301)</p>
          <p className="mt-1">
            Your role does not include regulatory OSHA read access. Ask an administrator if you need
            to view or edit recordkeeping fields.
          </p>
        </div>
      );
    }
    return (
      <p className="text-sm text-red-700" role="alert">
        {msg}
      </p>
    );
  }

  if (recordQuery.isLoading) {
    return (
      <p className="text-sm text-zinc-500" role="status">
        Loading OSHA record fields…
      </p>
    );
  }

  const record = recordQuery.data ?? null;
  const formKey = record
    ? `${record.id}-${record.updatedAt.getTime()}`
    : `new-${incidentId}`;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <OshaInjuryIllnessForm
        key={formKey}
        organizationId={organizationId}
        incidentId={incidentId}
        record={record}
        refPayload={refQuery.data}
        establishmentRows={establishments.data}
        establishmentError={establishments.isError}
        subjectRows={subjects.data}
        subjectError={subjects.isError}
      />
    </div>
  );
}
