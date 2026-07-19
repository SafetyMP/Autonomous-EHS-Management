// ADR-S-001 (R-001/R-004) — unit test for scripts/module-maturity-check.mjs.

import { describe, expect, it } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRIPT_URL = pathToFileURL(
  path.resolve(__dirname, "../../../scripts/module-maturity-check.mjs"),
).href;

type MaturityRow = {
  route: string;
  label: string;
  tier: string;
  stage: string;
  banner: string;
  notes: string;
  sourceLine: number;
};

type MaturityModule = {
  ALLOWED_TIERS: ReadonlyArray<string>;
  ALLOWED_STAGES: ReadonlyArray<string>;
  parseNavHrefs: (source: string) => ReadonlyArray<string>;
  parseMaturityRows: (markdown: string) => ReadonlyArray<MaturityRow>;
  validateRow: (row: MaturityRow) => ReadonlyArray<string>;
  crossCheckCoverage: (
    navHrefs: ReadonlyArray<string>,
    rows: ReadonlyArray<MaturityRow>,
  ) => ReadonlyArray<string>;
  checkDiffCoupling: (changedFiles: ReadonlyArray<string>) => ReadonlyArray<string>;
};

const loadModule = async (): Promise<MaturityModule> => {
  return (await import(SCRIPT_URL)) as MaturityModule;
};

const FIXTURE_TABLE = [
  "## Per-module tier map (routed dashboard modules)",
  "",
  "| Route | Label | Tier | Stage | Banner in UI? | Notes / residual gaps |",
  "|-------|-------|------|-------|---------------|-----------------------|",
  "| `/dashboard` | Command center | Core | S4 | No | Personal work queue. |",
  "| `/dashboard/chemicals` | Chemical inventory | Plumbing | S1 | Yes | Hazard catalogue only. |",
  "",
  "extra prose after table.",
].join("\n");

describe("parseNavHrefs", () => {
  it("extracts href values from a nav-links module fixture", async () => {
    const mod = await loadModule();
    const src = [
      "export const DASHBOARD_NAV_SECTIONS = [",
      "  { title: 'A', items: [{ href: '/dashboard', label: 'A' }] },",
      "  { title: 'B', items: [{ href: '/dashboard/tasks', label: 'B' }] },",
      "];",
    ].join("\n");
    const hrefs = mod.parseNavHrefs(src);
    expect([...hrefs]).toEqual(["/dashboard", "/dashboard/tasks"]);
  });
});

describe("parseMaturityRows", () => {
  it("parses each row of the per-module tier map", async () => {
    const mod = await loadModule();
    const rows = mod.parseMaturityRows(FIXTURE_TABLE);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      route: "/dashboard",
      tier: "Core",
      stage: "S4",
      banner: "No",
    });
    expect(rows[1]).toMatchObject({
      route: "/dashboard/chemicals",
      tier: "Plumbing",
      stage: "S1",
      banner: "Yes",
    });
  });

  it("throws when the per-module table header is absent", async () => {
    const mod = await loadModule();
    expect(() => mod.parseMaturityRows("# just a header")).toThrow(
      /Per-module tier map/,
    );
  });
});

describe("validateRow", () => {
  it("accepts a valid Core/S4 row", async () => {
    const mod = await loadModule();
    const row: MaturityRow = {
      route: "/dashboard",
      label: "Command center",
      tier: "Core",
      stage: "S4",
      banner: "No",
      notes: "Personal work queue.",
      sourceLine: 5,
    };
    expect(mod.validateRow(row)).toEqual([]);
  });

  it("rejects unknown tier", async () => {
    const mod = await loadModule();
    const row: MaturityRow = {
      route: "/dashboard/foo",
      label: "Foo",
      tier: "Beta",
      stage: "S2",
      banner: "No",
      notes: "",
      sourceLine: 10,
    };
    const errs = mod.validateRow(row);
    expect(errs.some((e) => /tier "Beta"/.test(e))).toBe(true);
  });

  it("rejects unknown stage", async () => {
    const mod = await loadModule();
    const row: MaturityRow = {
      route: "/dashboard/foo",
      label: "Foo",
      tier: "Core",
      stage: "S9",
      banner: "No",
      notes: "",
      sourceLine: 11,
    };
    const errs = mod.validateRow(row);
    expect(errs.some((e) => /stage "S9"/.test(e))).toBe(true);
  });

  it("rejects Plumbing+S4 without a counsel exception ID", async () => {
    const mod = await loadModule();
    const row: MaturityRow = {
      route: "/dashboard/chemicals",
      label: "Chemical inventory",
      tier: "Plumbing",
      stage: "S4",
      banner: "Yes",
      notes: "No counsel exception here.",
      sourceLine: 12,
    };
    const errs = mod.validateRow(row);
    expect(errs.some((e) => /counsel exception/.test(e))).toBe(true);
  });

  it("accepts Plumbing+S4 when CX-YYYY-N is present in the notes cell", async () => {
    const mod = await loadModule();
    const row: MaturityRow = {
      route: "/dashboard/chemicals",
      label: "Chemical inventory",
      tier: "Plumbing",
      stage: "S4",
      banner: "Yes",
      notes: "Counsel exception CX-2026-01 recorded in DPA.",
      sourceLine: 13,
    };
    expect(mod.validateRow(row)).toEqual([]);
  });

  it("rejects Gated+S4 without a counsel exception ID", async () => {
    const mod = await loadModule();
    const row: MaturityRow = {
      route: "/dashboard/privacy-requests",
      label: "Privacy",
      tier: "Gated",
      stage: "S4",
      banner: "Yes",
      notes: "no exception",
      sourceLine: 14,
    };
    const errs = mod.validateRow(row);
    expect(errs.some((e) => /counsel exception/.test(e))).toBe(true);
  });
});

describe("crossCheckCoverage", () => {
  it("reports a nav route without a maturity row", async () => {
    const mod = await loadModule();
    const rows: MaturityRow[] = [
      {
        route: "/dashboard",
        label: "Command",
        tier: "Core",
        stage: "S4",
        banner: "No",
        notes: "",
        sourceLine: 5,
      },
    ];
    const errs = mod.crossCheckCoverage(["/dashboard", "/dashboard/missing"], rows);
    expect(errs.some((e) => /"\/dashboard\/missing"/.test(e))).toBe(true);
  });

  it("reports a duplicate row for the same route", async () => {
    const mod = await loadModule();
    const rows: MaturityRow[] = [
      {
        route: "/dashboard",
        label: "Command",
        tier: "Core",
        stage: "S4",
        banner: "No",
        notes: "",
        sourceLine: 5,
      },
      {
        route: "/dashboard",
        label: "Command dup",
        tier: "Core",
        stage: "S4",
        banner: "No",
        notes: "",
        sourceLine: 6,
      },
    ];
    const errs = mod.crossCheckCoverage(["/dashboard"], rows);
    expect(errs.some((e) => /duplicate row/.test(e))).toBe(true);
  });
});

describe("checkDiffCoupling", () => {
  it("errors when maturity changed without procurement", async () => {
    const mod = await loadModule();
    const errs = mod.checkDiffCoupling(["docs/module-maturity.md", "docs/other.md"]);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/module-maturity\.md changed without/);
  });

  it("passes when both docs changed together", async () => {
    const mod = await loadModule();
    const errs = mod.checkDiffCoupling([
      "docs/module-maturity.md",
      "docs/procurement-readiness.md",
    ]);
    expect(errs).toEqual([]);
  });

  it("passes when neither doc changed", async () => {
    const mod = await loadModule();
    const errs = mod.checkDiffCoupling(["src/foo.ts"]);
    expect(errs).toEqual([]);
  });
});

describe("repository invariants", () => {
  it("live docs/module-maturity.md covers every DASHBOARD_NAV_SECTIONS href", async () => {
    const { readFileSync } = await import("node:fs");
    const mod = await loadModule();
    const navSrc = readFileSync(
      path.resolve(__dirname, "../../../src/lib/dashboard-nav-links.ts"),
      "utf8",
    );
    const mdSrc = readFileSync(
      path.resolve(__dirname, "../../../docs/module-maturity.md"),
      "utf8",
    );
    const hrefs = mod.parseNavHrefs(navSrc);
    const rows = mod.parseMaturityRows(mdSrc);
    const coverageErrs = mod.crossCheckCoverage(hrefs, rows);
    expect(coverageErrs).toEqual([]);
    for (const row of rows) {
      expect(mod.validateRow(row)).toEqual([]);
    }
  });
});
