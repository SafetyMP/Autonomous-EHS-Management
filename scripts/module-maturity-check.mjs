#!/usr/bin/env node
// ADR-S-001 (R-001/R-004) — module-maturity structural + coupling check.
//
// Invariants:
//   1. Every routed dashboard module in src/lib/dashboard-nav-links.ts has
//      exactly one row in docs/module-maturity.md's per-module tier map.
//   2. Every table row uses a legal tier {Core, Connected, Plumbing, Gated}
//      and stage {S0..S4}.
//   3. Plumbing/Gated + S4 requires an explicit counsel exception ID
//      matching /CX-\d{4}-\d+/ in the row (R-004 fail-closed).
//   4. Optional diff-coupling: when GITHUB_BASE_SHA (or --pr-base) is set and
//      docs/module-maturity.md changed relative to the base, then
//      docs/procurement-readiness.md must also have changed.
//
// The diff-coupling step is skipped when no base ref is available (e.g. local
// verify), and reported honestly.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

export const ALLOWED_TIERS = Object.freeze(["Core", "Connected", "Plumbing", "Gated"]);
export const ALLOWED_STAGES = Object.freeze(["S0", "S1", "S2", "S3", "S4"]);
const COUNSEL_EXCEPTION_RE = /CX-\d{4}-\d+/i;

const NAV_MODULE_REL = "src/lib/dashboard-nav-links.ts";
const MATURITY_MD_REL = "docs/module-maturity.md";
const PROCUREMENT_MD_REL = "docs/procurement-readiness.md";

/**
 * Parse href values out of DASHBOARD_NAV_SECTIONS. Kept regex-based (no TS
 * parser dep). The nav module is a small, stable literal — see comment there.
 */
export function parseNavHrefs(source) {
  const hrefs = new Set();
  const re = /href:\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    hrefs.add(m[1] ?? m[2] ?? m[3]);
  }
  return Array.from(hrefs).sort();
}

/**
 * Parse rows from the "Per-module tier map" table in module-maturity.md.
 * Returns array of `{ route, label, tier, stage, banner, notes, sourceLine }`.
 */
export function parseMaturityRows(markdown) {
  const lines = markdown.split(/\r?\n/);
  const rows = [];
  let inTable = false;
  let headerSeen = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!inTable) {
      if (/^## Per-module tier map/i.test(raw)) {
        inTable = "seeking";
      }
      continue;
    }
    if (inTable === "seeking") {
      const cells = splitRow(raw);
      if (cells.length >= 6 && /route/i.test(cells[0])) {
        headerSeen = true;
        inTable = "header-done";
      }
      continue;
    }
    if (inTable === "header-done") {
      if (/^\|\s*-+/.test(raw)) {
        inTable = "body";
      }
      continue;
    }
    if (inTable === "body") {
      if (!raw.trim().startsWith("|")) {
        break;
      }
      const cells = splitRow(raw);
      if (cells.length < 6) continue;
      const [routeCell, labelCell, tierCell, stageCell, bannerCell, notesCell] = cells;
      const routeMatch = routeCell.match(/`([^`]+)`/);
      const route = routeMatch ? routeMatch[1] : routeCell;
      rows.push({
        route,
        label: labelCell,
        tier: tierCell,
        stage: stageCell,
        banner: bannerCell,
        notes: notesCell,
        sourceLine: i + 1,
      });
    }
  }

  if (!headerSeen) {
    throw new Error(
      "module-maturity-check: could not find 'Per-module tier map' table header in docs/module-maturity.md",
    );
  }
  return rows;
}

function splitRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return [];
  }
  const inner = trimmed.slice(1, -1);
  return inner.split("|").map((c) => c.trim());
}

export function validateRow(row) {
  const errors = [];
  if (!row.route.startsWith("/dashboard")) {
    errors.push(`row ${row.sourceLine}: route "${row.route}" does not start with /dashboard`);
  }
  if (!ALLOWED_TIERS.includes(row.tier)) {
    errors.push(
      `row ${row.sourceLine} (${row.route}): tier "${row.tier}" not in {${ALLOWED_TIERS.join(", ")}}`,
    );
  }
  if (!ALLOWED_STAGES.includes(row.stage)) {
    errors.push(
      `row ${row.sourceLine} (${row.route}): stage "${row.stage}" not in {${ALLOWED_STAGES.join(", ")}}`,
    );
  }
  if ((row.tier === "Plumbing" || row.tier === "Gated") && row.stage === "S4") {
    if (!COUNSEL_EXCEPTION_RE.test(`${row.banner} ${row.notes}`)) {
      errors.push(
        `row ${row.sourceLine} (${row.route}): ${row.tier} + S4 requires counsel exception ID (CX-YYYY-N) per docs/lifecycle/promotion-packet.md §5`,
      );
    }
  }
  return errors;
}

export function crossCheckCoverage(navHrefs, rows) {
  const errors = [];
  const rowRoutes = rows.map((r) => r.route);
  const rowRouteSet = new Set(rowRoutes);

  // Duplicates.
  const seen = new Set();
  for (const r of rowRoutes) {
    if (seen.has(r)) {
      errors.push(`duplicate row for route "${r}" in module-maturity.md`);
    }
    seen.add(r);
  }

  // Missing rows (nav has it, table doesn't).
  for (const href of navHrefs) {
    if (!rowRouteSet.has(href)) {
      errors.push(
        `missing tier row for nav href "${href}" — every DASHBOARD_NAV_SECTIONS entry must appear in module-maturity.md per-module table`,
      );
    }
  }

  return errors;
}

function safeGitDiffChanged(baseRef, headRef, rootDir) {
  try {
    const out = execFileSync(
      "git",
      ["diff", "--name-only", `${baseRef}..${headRef}`],
      { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  } catch {
    return null;
  }
}

export function checkDiffCoupling(changedFiles) {
  const maturityChanged = changedFiles.includes(MATURITY_MD_REL);
  const procurementChanged = changedFiles.includes(PROCUREMENT_MD_REL);
  if (maturityChanged && !procurementChanged) {
    return [
      `${MATURITY_MD_REL} changed without ${PROCUREMENT_MD_REL}; ADR-S-001 requires the two docs to move together (see docs/lifecycle/promotion-packet.md §2 artifact 6).`,
    ];
  }
  return [];
}

export async function runMaturityCheck({
  rootDir = REPO_ROOT,
  navPath = NAV_MODULE_REL,
  maturityPath = MATURITY_MD_REL,
  prBase,
  prHead = "HEAD",
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  const errors = [];
  const notes = [];

  const navAbs = path.resolve(rootDir, navPath);
  const maturityAbs = path.resolve(rootDir, maturityPath);
  if (!existsSync(navAbs)) {
    stderr.write(`module-maturity-check: missing ${navPath}\n`);
    return 1;
  }
  if (!existsSync(maturityAbs)) {
    stderr.write(`module-maturity-check: missing ${maturityPath}\n`);
    return 1;
  }

  const navSource = await readFile(navAbs, "utf8");
  const maturitySource = await readFile(maturityAbs, "utf8");
  const navHrefs = parseNavHrefs(navSource);
  let rows;
  try {
    rows = parseMaturityRows(maturitySource);
  } catch (err) {
    stderr.write(`module-maturity-check: ${err.message}\n`);
    return 1;
  }

  for (const row of rows) {
    errors.push(...validateRow(row));
  }
  errors.push(...crossCheckCoverage(navHrefs, rows));

  const base = prBase ?? process.env.GITHUB_BASE_SHA ?? null;
  if (base) {
    const changed = safeGitDiffChanged(base, prHead, rootDir);
    if (changed === null) {
      notes.push(
        `diff-coupling: could not run 'git diff ${base}..${prHead}' — skipping coupling check.`,
      );
    } else {
      errors.push(...checkDiffCoupling(changed));
    }
  } else {
    notes.push(
      "diff-coupling: no base ref (GITHUB_BASE_SHA / --pr-base); skipping — coupling is enforced in CI PR runs only.",
    );
  }

  if (errors.length > 0) {
    for (const e of errors) {
      stderr.write(`module-maturity-check: ${e}\n`);
    }
    stderr.write(
      `module-maturity-check: FAILED — ${errors.length} error(s). See ADR-S-001 and docs/lifecycle/promotion-packet.md.\n`,
    );
    return 1;
  }

  for (const n of notes) {
    stdout.write(`module-maturity-check: ${n}\n`);
  }
  stdout.write(
    `module-maturity-check: ok — ${rows.length} rows cover ${navHrefs.length} nav hrefs (ADR-S-001, R-001/R-004).\n`,
  );
  return 0;
}

function parseArgv(argv) {
  const opts = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--pr-base=")) opts.prBase = a.slice("--pr-base=".length);
    else if (a === "--pr-base") opts.prBase = argv[++i];
    else if (a.startsWith("--pr-head=")) opts.prHead = a.slice("--pr-head=".length);
    else if (a === "--pr-head") opts.prHead = argv[++i];
  }
  return opts;
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  const opts = parseArgv(process.argv);
  runMaturityCheck(opts).then((code) => {
    process.exit(code);
  }).catch((err) => {
    process.stderr.write(`module-maturity-check: crashed ${err?.stack ?? err}\n`);
    process.exit(2);
  });
}
