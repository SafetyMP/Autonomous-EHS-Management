"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ModuleMaturityBanner } from "@/components/dashboard/module-maturity-banner";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfControl,
  dfHelperXs,
  dfLabel,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import {
  HEAT_NEP_CHECK_KEYS,
  HEAT_NEP_CHECK_LABELS,
  HEAT_PROGRAM_CHECK_STATUSES,
  type HeatNepCheckKey,
  type HeatProgramCheckStatus,
} from "@/lib/regulatory/heatNepAppendixI";
import { trpc } from "@/trpc/react";

type CheckDraft = {
  status: HeatProgramCheckStatus;
  evidenceNotes: string;
};

type ProgramRow = {
  id: string;
  title: string;
  writtenPlanUri: string | null;
  notes: string | null;
  coversOutdoor: boolean;
  coversIndoor: boolean;
  naicsNote: string | null;
};

type CheckRow = {
  checkKey: string;
  status: string;
  evidenceNotes: string | null;
};

function buildCheckDrafts(checks: CheckRow[]): Record<string, CheckDraft> {
  const next: Record<string, CheckDraft> = {};
  for (const key of HEAT_NEP_CHECK_KEYS) {
    const row = checks.find((c) => c.checkKey === key);
    next[key] = {
      status: (row?.status as HeatProgramCheckStatus) ?? "not_started",
      evidenceNotes: row?.evidenceNotes ?? "",
    };
  }
  return next;
}

function HeatProgramEditor({
  organizationId,
  siteId,
  program,
  checks,
  onSaved,
}: {
  organizationId: string;
  siteId: string;
  program: ProgramRow | null;
  checks: CheckRow[];
  onSaved: (msg: string) => void;
}) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(program?.title ?? "Heat illness prevention program");
  const [writtenPlanUri, setWrittenPlanUri] = useState(program?.writtenPlanUri ?? "");
  const [notes, setNotes] = useState(program?.notes ?? "");
  const [coversOutdoor, setCoversOutdoor] = useState(program?.coversOutdoor ?? true);
  const [coversIndoor, setCoversIndoor] = useState(program?.coversIndoor ?? false);
  const [naicsNote, setNaicsNote] = useState(program?.naicsNote ?? "");
  const [checkDrafts, setCheckDrafts] = useState(() => buildCheckDrafts(checks));
  const [logHeatIndex, setLogHeatIndex] = useState("");
  const [logWbgt, setLogWbgt] = useState("");
  const [logSource, setLogSource] = useState("");

  const upsert = trpc.compliance.heatProgram.upsert.useMutation({
    onSuccess: () => {
      void utils.compliance.heatProgram.get.invalidate();
      onSaved("Heat program pack saved.");
    },
  });
  const upsertChecks = trpc.compliance.heatProgram.upsertChecks.useMutation({
    onSuccess: () => {
      void utils.compliance.heatProgram.get.invalidate();
      onSaved("Checklist saved.");
    },
  });
  const createLog = trpc.compliance.heatProgram.createConditionLog.useMutation({
    onSuccess: () => {
      void utils.compliance.heatProgram.listConditionLogs.invalidate();
      onSaved("Condition log entry added.");
    },
  });
  const logs = trpc.compliance.heatProgram.listConditionLogs.useQuery(
    { organizationId, programId: program?.id, limit: 20 },
    { enabled: !!program?.id },
  );

  const exportPack = useMemo(() => {
    return async () => {
      const data = await utils.compliance.heatProgram.exportJson.fetch({
        organizationId,
        siteId: siteId || null,
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `heat-nep-program-aid-${organizationId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onSaved("Exported program aid JSON (not agency filing).");
    };
  }, [organizationId, onSaved, siteId, utils.compliance.heatProgram.exportJson]);

  return (
    <>
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={dfSectionHeading}>Program pack</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            upsert.mutate({
              organizationId,
              siteId: siteId || null,
              title,
              writtenPlanUri: writtenPlanUri || null,
              notes: notes || null,
              coversOutdoor,
              coversIndoor,
              naicsNote: naicsNote || null,
            });
          }}
        >
          <label className={`${dfLabel} block`}>
            Title
            <input
              className={`${dfControl} mt-1`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label className={`${dfLabel} block`}>
            Written plan URI
            <input
              className={`${dfControl} mt-1`}
              value={writtenPlanUri}
              onChange={(e) => setWrittenPlanUri(e.target.value)}
              placeholder="https://… or document://…"
            />
          </label>
          <label className={`${dfLabel} block`}>
            Notes
            <textarea
              className={`${dfControl} mt-1`}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <label className={`${dfLabel} block`}>
            NAICS / targeting note
            <input
              className={`${dfControl} mt-1`}
              value={naicsNote}
              onChange={(e) => setNaicsNote(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={coversOutdoor}
                onChange={(e) => setCoversOutdoor(e.target.checked)}
              />
              Covers outdoor work
            </label>
            <label className="inline-flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={coversIndoor}
                onChange={(e) => setCoversIndoor(e.target.checked)}
              />
              Covers indoor work
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={upsert.isPending} aria-busy={upsert.isPending} className={dfPrimarySubmit}>
              Save program pack
            </button>
            <button type="button" className={dfSecondaryOutline} onClick={() => void exportPack()}>
              Export JSON (program aid)
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={dfSectionHeading}>Appendix I checklist</h2>
        <p className={`mt-1 ${dfHelperXs}`}>
          Save the program pack first if this site has no record yet, then update checklist rows.
        </p>
        <ul className="mt-4 space-y-4">
          {HEAT_NEP_CHECK_KEYS.map((key: HeatNepCheckKey) => {
            const draft = checkDrafts[key] ?? { status: "not_started" as const, evidenceNotes: "" };
            return (
              <li key={key} className="rounded-md border border-zinc-100 p-3">
                <p className="font-medium text-zinc-900">{HEAT_NEP_CHECK_LABELS[key]}</p>
                <label className={`${dfLabel} mt-2 block`}>
                  Status
                  <select
                    className={`${dfControl} mt-1`}
                    value={draft.status}
                    onChange={(e) =>
                      setCheckDrafts((prev) => ({
                        ...prev,
                        [key]: {
                          ...draft,
                          status: e.target.value as HeatProgramCheckStatus,
                        },
                      }))
                    }
                  >
                    {HEAT_PROGRAM_CHECK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={`${dfLabel} mt-2 block`}>
                  Evidence notes
                  <textarea
                    className={`${dfControl} mt-1`}
                    rows={2}
                    value={draft.evidenceNotes}
                    onChange={(e) =>
                      setCheckDrafts((prev) => ({
                        ...prev,
                        [key]: { ...draft, evidenceNotes: e.target.value },
                      }))
                    }
                  />
                </label>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className={`${dfPrimarySubmit} mt-4`}
          disabled={!program || upsertChecks.isPending}
          aria-busy={upsertChecks.isPending}
          onClick={() => {
            if (!program) return;
            upsertChecks.mutate({
              organizationId,
              programId: program.id,
              checks: HEAT_NEP_CHECK_KEYS.map((key) => ({
                checkKey: key,
                status: checkDrafts[key]?.status ?? "not_started",
                evidenceNotes: checkDrafts[key]?.evidenceNotes || null,
                reviewedAt: new Date(),
              })),
            });
          }}
        >
          Save checklist
        </button>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={dfSectionHeading}>Heat condition log</h2>
        <p className={`mt-1 ${dfHelperXs}`}>
          Optional site monitoring evidence (heat index / WBGT). Online desk entry only.
        </p>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createLog.mutate({
              organizationId,
              programId: program?.id ?? null,
              siteId: siteId || null,
              observedAt: new Date(),
              heatIndexF: logHeatIndex ? Number(logHeatIndex) : null,
              wbgtF: logWbgt ? Number(logWbgt) : null,
              source: logSource || null,
            });
            setLogHeatIndex("");
            setLogWbgt("");
            setLogSource("");
          }}
        >
          <label className={`${dfLabel} block`}>
            Heat index (°F)
            <input
              className={`${dfControl} mt-1`}
              inputMode="decimal"
              value={logHeatIndex}
              onChange={(e) => setLogHeatIndex(e.target.value)}
            />
          </label>
          <label className={`${dfLabel} block`}>
            WBGT (°F)
            <input
              className={`${dfControl} mt-1`}
              inputMode="decimal"
              value={logWbgt}
              onChange={(e) => setLogWbgt(e.target.value)}
            />
          </label>
          <label className={`${dfLabel} block sm:col-span-2`}>
            Source
            <input
              className={`${dfControl} mt-1`}
              value={logSource}
              onChange={(e) => setLogSource(e.target.value)}
              placeholder="NWS, site meter, etc."
            />
          </label>
          <button
            type="submit"
            className={dfPrimarySubmit}
            disabled={createLog.isPending}
            aria-busy={createLog.isPending}
          >
            Add log entry
          </button>
        </form>
        <ul className="mt-4 divide-y rounded-lg border border-zinc-100 text-sm">
          {(logs.data ?? []).length === 0 ? (
            <li className="px-4 py-3 text-zinc-700">No condition logs yet.</li>
          ) : (
            logs.data?.map((row) => (
              <li key={row.id} className="px-4 py-3">
                <p className="font-medium text-zinc-900">
                  {new Date(row.observedAt).toLocaleString()}
                </p>
                <p className={dfHelperXs}>
                  HI {row.heatIndexF ?? "—"} · WBGT {row.wbgtF ?? "—"} · {row.source ?? "—"}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </>
  );
}

export default function HeatProgramPage() {
  const { organizationId } = useOrg();
  const org = organizationId!;

  const { data: sites } = trpc.organization.sites.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );
  const [siteId, setSiteId] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const programQuery = trpc.compliance.heatProgram.get.useQuery(
    { organizationId: org, siteId: siteId || null },
    { enabled: !!organizationId },
  );
  const catalog = trpc.compliance.heatProgram.checklistCatalog.useQuery();

  const forbidden =
    programQuery.error?.message?.match(/forbidden|permission/i) != null ||
    catalog.error?.message?.match(/forbidden|permission/i) != null;

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Heat NEP program aid</h1>
        <OrgSwitcher />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Heat NEP program aid</h1>
        <OrgSwitcher />
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          You do not have permission to view heat program records (`heat_program:read`).
        </p>
      </div>
    );
  }

  const editorKey = `${siteId || "org"}-${programQuery.data?.program?.id ?? "new"}-${programQuery.dataUpdatedAt}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Heat NEP program aid</h1>
          <p className={dfMuted}>
            Appendix I–aligned self-audit for inspection readiness.{" "}
            <Link href="/dashboard/planning" className="font-medium text-emerald-900 underline">
              Planning hub
            </Link>
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <ModuleMaturityBanner tier="connected">
        Connected maturity — Heat NEP Appendix I program aid only. Not a federal heat standard or
        Cal/OSHA compliance determination. See docs/module-maturity.md.
      </ModuleMaturityBanner>

      <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        Program aid only — supports OSHA Heat NEP inspection readiness. Not a federal heat standard
        determination and not a Cal/OSHA §§3395/3396 compliance engine.
        <details className="mt-2">
          <summary className="cursor-pointer font-medium">Regulatory reference</summary>
          <p className={`mt-1 ${dfHelperXs}`}>
            Checklist version {catalog.data?.version ?? "…"}. Aligns to evaluation factors in OSHA
            CPL 03-00-024 Appendix I (Heat NEP effective 2026-04-10). Federal heat standard remains
            pending; state-plan rules may apply separately. See
            docs/regulatory/heat-nep-cpl-03-00-024.md.
          </p>
        </details>
      </div>

      {statusMsg ? (
        <p role="status" className="text-sm text-emerald-900">
          {statusMsg}
        </p>
      ) : null}

      <label className={`${dfLabel} block max-w-md`}>
        Site (optional — blank = organization-wide)
        <select
          className={`${dfControl} mt-1`}
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          aria-label="Site for heat program"
        >
          <option value="">Organization-wide</option>
          {sites?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      {programQuery.isLoading ? (
        <p className={dfMuted} role="status">
          Loading heat program…
        </p>
      ) : (
        <HeatProgramEditor
          key={editorKey}
          organizationId={organizationId}
          siteId={siteId}
          program={programQuery.data?.program ?? null}
          checks={programQuery.data?.checks ?? []}
          onSaved={setStatusMsg}
        />
      )}
    </div>
  );
}
