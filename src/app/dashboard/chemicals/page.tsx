"use client";

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
  categoriesForHazardClass,
  EPCRA_HAZARD_CLASS_OPTIONS,
} from "@/lib/regulatory/epcraHazardCategories2027";
import { trpc } from "@/trpc/react";

export default function ChemicalsPage() {
  const { organizationId } = useOrg();
  const org = organizationId!;
  const utils = trpc.useUtils();

  const chemicals = trpc.compliance.chemicalInventory.listChemicals.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );
  const establishments = trpc.compliance.establishment.list.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );
  const sdsList = trpc.compliance.chemicalInventory.listSds.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );
  const classifications = trpc.compliance.chemicalInventory.listClassifications.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );

  const createChemical = trpc.compliance.chemicalInventory.createChemical.useMutation({
    onSuccess: () => void utils.compliance.chemicalInventory.listChemicals.invalidate(),
  });
  const createSds = trpc.compliance.chemicalInventory.createSds.useMutation({
    onSuccess: () => void utils.compliance.chemicalInventory.listSds.invalidate(),
  });
  const setClassification = trpc.compliance.chemicalInventory.setClassification.useMutation({
    onSuccess: () => void utils.compliance.chemicalInventory.listClassifications.invalidate(),
  });
  const deleteClassification = trpc.compliance.chemicalInventory.deleteClassification.useMutation({
    onSuccess: () => void utils.compliance.chemicalInventory.listClassifications.invalidate(),
  });
  const upsertInventory = trpc.compliance.chemicalInventory.upsertInventory.useMutation({
    onSuccess: () => setStatusMsg("Inventory snapshot saved (programme aid)."),
  });

  const [chemName, setChemName] = useState("");
  const [cas, setCas] = useState("");
  const [sdsTitle, setSdsTitle] = useState("");
  const [sdsChemId, setSdsChemId] = useState("");
  const [hazardChemId, setHazardChemId] = useState("");
  const [hazardClass, setHazardClass] = useState(EPCRA_HAZARD_CLASS_OPTIONS[0] ?? "");
  const [hazardCategory, setHazardCategory] = useState("");
  const [estId, setEstId] = useState("");
  const [invChemId, setInvChemId] = useState("");
  const [invYear, setInvYear] = useState(String(new Date().getFullYear()));
  const [invAmount, setInvAmount] = useState("");
  const [invUnit, setInvUnit] = useState("lb");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () => categoriesForHazardClass(hazardClass),
    [hazardClass],
  );

  const forbidden = chemicals.error?.message?.match(/forbidden|permission/i) != null;

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Chemical inventory</h1>
        <OrgSwitcher />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Chemical inventory</h1>
        <OrgSwitcher />
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          You do not have permission to view chemical inventory (`chemical_inventory:read`).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Chemical inventory</h1>
          <p className={dfMuted}>
            Tier II–oriented programme register with HCS 2024 / EPCRA 2027 hazard classes
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <ModuleMaturityBanner tier="plumbing">
        Plumbing maturity — useful for programme inventory and hazard classification. Not promoted to
        Core workflow depth yet.
      </ModuleMaturityBanner>

      <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        Not an EPA Tier II / Tier2 Submit system. Hazard categories are a programme-of-record
        allowlist for internal inventory management toward RY2027; customers remain responsible for
        agency submissions and e-filing.
        <details className="mt-2">
          <summary className="cursor-pointer font-medium">Effective dates</summary>
          <p className={`mt-1 ${dfHelperXs}`}>
            EPA EPCRA conformity final rule 2026-06-22 (91 FR 37022); effective 2026-08-21; new
            categories required for 2027 inventory reports due 2028-03-01. See
            docs/regulatory/epcra-hazard-categories-2027.md.
          </p>
        </details>
      </div>

      {statusMsg ? (
        <p role="status" className="text-sm text-emerald-900">
          {statusMsg}
        </p>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={dfSectionHeading}>Chemicals</h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createChemical.mutate(
              {
                organizationId,
                name: chemName,
                casNumber: cas || null,
              },
              {
                onSuccess: () => {
                  setChemName("");
                  setCas("");
                  setStatusMsg("Chemical added.");
                },
              },
            );
          }}
        >
          <label className={`${dfLabel} block`}>
            Name
            <input
              required
              className={`${dfControl} mt-1`}
              value={chemName}
              onChange={(e) => setChemName(e.target.value)}
            />
          </label>
          <label className={`${dfLabel} block`}>
            CAS number
            <input
              className={`${dfControl} mt-1`}
              value={cas}
              onChange={(e) => setCas(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className={dfPrimarySubmit}
            disabled={createChemical.isPending}
            aria-busy={createChemical.isPending}
          >
            Add chemical
          </button>
        </form>
        <ul className="mt-4 divide-y rounded-lg border border-zinc-100 text-sm">
          {(chemicals.data ?? []).length === 0 ? (
            <li className="px-4 py-3 text-zinc-700">
              Add a chemical to start programme inventory.
            </li>
          ) : (
            chemicals.data?.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <p className="font-medium text-zinc-900">{c.name}</p>
                <p className={dfHelperXs}>CAS {c.casNumber ?? "—"}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={dfSectionHeading}>SDS references</h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createSds.mutate(
              {
                organizationId,
                title: sdsTitle,
                regulatoryChemicalId: sdsChemId || null,
              },
              {
                onSuccess: () => {
                  setSdsTitle("");
                  setStatusMsg("SDS reference added.");
                },
              },
            );
          }}
        >
          <label className={`${dfLabel} block`}>
            Title
            <input
              required
              className={`${dfControl} mt-1`}
              value={sdsTitle}
              onChange={(e) => setSdsTitle(e.target.value)}
            />
          </label>
          <label className={`${dfLabel} block`}>
            Chemical
            <select
              className={`${dfControl} mt-1`}
              value={sdsChemId}
              onChange={(e) => setSdsChemId(e.target.value)}
            >
              <option value="">Unlinked</option>
              {chemicals.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={dfPrimarySubmit} disabled={createSds.isPending}>
            Add SDS ref
          </button>
        </form>
        <ul className="mt-4 divide-y rounded-lg border border-zinc-100 text-sm">
          {(sdsList.data ?? []).length === 0 ? (
            <li className="px-4 py-3 text-zinc-700">No SDS references yet.</li>
          ) : (
            sdsList.data?.map((s) => (
              <li key={s.id} className="px-4 py-3">
                {s.title}
                <span className={dfHelperXs}> · rev {s.revision ?? "—"}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={dfSectionHeading}>Hazard classifications (HCS / EPCRA)</h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!hazardCategory) return;
            setClassification.mutate(
              {
                organizationId,
                regulatoryChemicalId: hazardChemId || null,
                hazardClass,
                hazardCategory,
                source: "manual",
              },
              {
                onSuccess: () => {
                  setHazardCategory("");
                  setStatusMsg("Hazard classification saved.");
                },
              },
            );
          }}
        >
          <label className={`${dfLabel} block`}>
            Chemical
            <select
              className={`${dfControl} mt-1`}
              value={hazardChemId}
              onChange={(e) => setHazardChemId(e.target.value)}
            >
              <option value="">Select…</option>
              {chemicals.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className={`${dfLabel} block`}>
            Hazard class
            <select
              className={`${dfControl} mt-1`}
              value={hazardClass}
              onChange={(e) => {
                setHazardClass(e.target.value);
                setHazardCategory("");
              }}
            >
              {EPCRA_HAZARD_CLASS_OPTIONS.map((hc) => (
                <option key={hc} value={hc}>
                  {hc}
                </option>
              ))}
            </select>
          </label>
          <label className={`${dfLabel} block`}>
            Category
            <select
              required
              className={`${dfControl} mt-1`}
              value={hazardCategory}
              onChange={(e) => setHazardCategory(e.target.value)}
            >
              <option value="">Select…</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={dfPrimarySubmit} disabled={setClassification.isPending}>
            Add classification
          </button>
        </form>
        <ul className="mt-4 divide-y rounded-lg border border-zinc-100 text-sm">
          {(classifications.data ?? []).length === 0 ? (
            <li className="px-4 py-3 text-zinc-700">No hazard classifications yet.</li>
          ) : (
            classifications.data?.map((row) => (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                <div>
                  <p className="font-medium text-zinc-900">
                    {row.hazardClass} — {row.hazardCategory}
                  </p>
                  <p className={dfHelperXs}>
                    {row.hazardDomain} · {row.source}
                  </p>
                </div>
                <button
                  type="button"
                  className={dfSecondaryOutline}
                  onClick={() =>
                    deleteClassification.mutate({
                      organizationId,
                      classificationId: row.id,
                    })
                  }
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={dfSectionHeading}>Inventory snapshot (max on hand)</h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!estId || !invChemId) return;
            upsertInventory.mutate({
              organizationId,
              establishmentId: estId,
              regulatoryChemicalId: invChemId,
              reportingYear: Number(invYear),
              maxAmount: Number(invAmount),
              amountUnit: invUnit,
            });
          }}
        >
          <label className={`${dfLabel} block`}>
            Establishment
            <select
              required
              className={`${dfControl} mt-1`}
              value={estId}
              onChange={(e) => setEstId(e.target.value)}
            >
              <option value="">Select…</option>
              {establishments.data?.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.name}
                </option>
              ))}
            </select>
          </label>
          <label className={`${dfLabel} block`}>
            Chemical
            <select
              required
              className={`${dfControl} mt-1`}
              value={invChemId}
              onChange={(e) => setInvChemId(e.target.value)}
            >
              <option value="">Select…</option>
              {chemicals.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={`${dfLabel} block`}>
              Year
              <input
                required
                className={`${dfControl} mt-1`}
                value={invYear}
                onChange={(e) => setInvYear(e.target.value)}
              />
            </label>
            <label className={`${dfLabel} block`}>
              Max amount
              <input
                required
                className={`${dfControl} mt-1`}
                inputMode="decimal"
                value={invAmount}
                onChange={(e) => setInvAmount(e.target.value)}
              />
            </label>
            <label className={`${dfLabel} block`}>
              Unit
              <input
                required
                className={`${dfControl} mt-1`}
                value={invUnit}
                onChange={(e) => setInvUnit(e.target.value)}
              />
            </label>
          </div>
          <button type="submit" className={dfPrimarySubmit} disabled={upsertInventory.isPending}>
            Save inventory snapshot
          </button>
        </form>
        <button
          type="button"
          className={`${dfSecondaryOutline} mt-3`}
          disabled={!estId}
          onClick={async () => {
            if (!estId) return;
            const data = await utils.compliance.chemicalInventory.exportInventoryJson.fetch({
              organizationId,
              establishmentId: estId,
              reportingYear: Number(invYear) || undefined,
            });
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `chemical-inventory-program-aid.json`;
            a.click();
            URL.revokeObjectURL(url);
            setStatusMsg("Exported programme inventory JSON (not EPA filing).");
          }}
        >
          Export JSON (program aid)
        </button>
      </section>
    </div>
  );
}
