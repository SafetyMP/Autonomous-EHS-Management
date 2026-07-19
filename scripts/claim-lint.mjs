#!/usr/bin/env node
// ADR-S-001 (R-005) — anti-oversell claim lint.
// RR-CF-001 / AC-CF-A003 — WCAG 3 conformance claim lint (`--wcag3`).
// Fails non-zero when a banned marketing phrase appears in a buyer-facing doc
// outside a documented `<!-- claim-lint:ignore-start -->` fence.

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

/**
 * Banned marketing phrases (R-005). Add a phrase here AND in
 * docs/regulatory-posture-boundary.md "Acceptable vs prohibited" AND in the
 * matching unit test in tests/unit/lifecycle/claim-lint.test.ts. Regex is
 * intentionally case-insensitive and word-boundary permissive so common
 * paraphrases still catch (e.g. "Filing-Ready", "filing ready").
 *
 * Each entry:
 *  - id: stable slug used in reporter output and tests.
 *  - phrase: display name used in the report.
 *  - pattern: RegExp source (without flags) matched with `iu`.
 */
export const BANNED_PHRASES = Object.freeze([
  {
    id: "filing-ready",
    phrase: "filing-ready",
    pattern: "filing[\\s-]?ready",
  },
  {
    id: "agency-sor",
    phrase: "agency SoR",
    pattern: "agency\\s+SoR",
  },
  {
    id: "tier2-submit",
    phrase: "Tier2 Submit",
    pattern: "Tier\\s?2\\s+Submit",
  },
  {
    id: "erase-everything",
    phrase: "erase everything",
    pattern: "erase\\s+everything",
  },
  {
    id: "certification-body",
    phrase: "certification body",
    pattern: "certification\\s+body",
  },
  {
    id: "osha-ready",
    phrase: "OSHA-ready",
    pattern: "OSHA[\\s-]?ready",
  },
  {
    id: "gdpr-compliant-erasure",
    phrase: "GDPR-compliant automated erasure",
    pattern: "GDPR[\\s-]?compliant\\s+automated\\s+erasure",
  },
  {
    id: "autonomous-ai-ehs",
    phrase: "autonomous AI EHS",
    pattern: "autonomous\\s+AI\\s+EHS",
  },
]);

/**
 * RR-CF-001 forbidden WCAG 3 conformance verbs (ADR-UX-007 §8).
 * Matched case-insensitively; negative / forbidden-list context is skipped.
 */
export const WCAG3_BANNED_PHRASES = Object.freeze([
  {
    id: "wcag3-conformant",
    phrase: "WCAG 3 conformant",
    pattern: "WCAG\\s*3(?:\\.0)?\\s+conformant",
  },
  {
    id: "wcag3-certified",
    phrase: "WCAG 3 certified",
    pattern: "WCAG\\s*3(?:\\.0)?\\s+certified",
  },
  {
    id: "meets-wcag3",
    phrase: "meets WCAG 3",
    pattern: "meets\\s+WCAG\\s*3(?:\\.0)?\\b",
  },
  {
    id: "compliant-with-wcag3",
    phrase: "compliant with WCAG 3",
    pattern: "compliant\\s+with\\s+WCAG\\s*3(?:\\.0)?\\b",
  },
  {
    id: "wcag3-compliant",
    phrase: "WCAG 3 compliant",
    pattern: "WCAG\\s*3(?:\\.0)?\\s+compliant",
  },
]);

/** Buyer-facing docs the lint scans (paths relative to repo root). */
export const DEFAULT_TARGETS = Object.freeze([
  "README.md",
  "docs/procurement-readiness.md",
  "docs/regulatory-posture-boundary.md",
  "COMPLIANCE.md",
]);

/** Design-intent disclaimer that labels a WCAG 3 readiness note (ADR-UX-007 §8). */
export const WCAG3_DISCLAIMER =
  "WCAG 3 conformance is not claimed; this is design intent only.";

const FENCE_START = /<!--\s*claim-lint:ignore-start\b[^>]*-->/i;
const FENCE_END = /<!--\s*claim-lint:ignore-end\b[^>]*-->/i;
const INLINE_IGNORE = /<!--\s*claim-lint:ignore-line\b[^>]*-->/i;
const WCAG3_FENCE_START = /<!--\s*wcag3-claim-lint:ignore-start\b[^>]*-->/i;
const WCAG3_FENCE_END = /<!--\s*wcag3-claim-lint:ignore-end\b[^>]*-->/i;
const WCAG3_INLINE_IGNORE = /<!--\s*wcag3-claim-lint:ignore-line\b[^>]*-->/i;

/** Lines that document the ban rather than assert conformance. */
const WCAG3_NEGATIVE_CONTEXT =
  /forbidden|prohibited|must\s+not|do\s+not|does\s+not|not\s+claimed|no\s+wcag\s*3|forbid(?:ding)?\s+wcag\s*3|without\s+wcag\s*3|claim(?:ing)?\s+wcag\s*3|wcag\s*3\s+conformance\s+is\s+not|out\s+of\s+scope|describe\s+only|residual/i;

/**
 * Split content into lines with `inFence` markers. Exposed for testing.
 */
export function annotateLines(content) {
  const lines = content.split(/\r?\n/);
  let inFence = false;
  return lines.map((raw, idx) => {
    let effective = inFence;
    if (!inFence && FENCE_START.test(raw)) {
      inFence = true;
      effective = true;
    } else if (inFence && FENCE_END.test(raw)) {
      inFence = false;
      effective = true; // the closing marker line itself stays in-fence
    }
    return { line: idx + 1, raw, inFence: effective };
  });
}

/**
 * Annotate lines with WCAG3-specific ignore fences (and shared claim-lint fences).
 */
export function annotateWcag3Lines(content) {
  const lines = content.split(/\r?\n/);
  let inFence = false;
  let inCodeFence = false;
  return lines.map((raw, idx) => {
    if (/^```/.test(raw.trim())) {
      inCodeFence = !inCodeFence;
    }
    let effective = inFence || inCodeFence;
    if (!inFence && (FENCE_START.test(raw) || WCAG3_FENCE_START.test(raw))) {
      inFence = true;
      effective = true;
    } else if (inFence && (FENCE_END.test(raw) || WCAG3_FENCE_END.test(raw))) {
      inFence = false;
      effective = true;
    }
    return { line: idx + 1, raw, inFence: effective };
  });
}

/**
 * Return findings for a single file body.
 * @param {string} content
 * @param {string} label - path used in reporter output
 * @returns {Array<{file:string,line:number,phrase:string,id:string,text:string}>}
 */
export function findViolations(content, label = "<memory>") {
  const findings = [];
  const annotated = annotateLines(content);
  for (const { line, raw, inFence } of annotated) {
    if (inFence) continue;
    if (INLINE_IGNORE.test(raw)) continue;
    for (const entry of BANNED_PHRASES) {
      const re = new RegExp(entry.pattern, "iu");
      if (re.test(raw)) {
        findings.push({
          file: label,
          line,
          phrase: entry.phrase,
          id: entry.id,
          text: raw.trim(),
        });
      }
    }
  }
  return findings;
}

/**
 * Strip markdown inline code spans so policy tables listing banned phrases do not fail.
 */
function stripInlineCode(raw) {
  return raw.replace(/`[^`]*`/g, "");
}

/**
 * WCAG 3 claim findings for one file body (RR-CF-001).
 */
export function findWcag3Violations(content, label = "<memory>") {
  const findings = [];
  const annotated = annotateWcag3Lines(content);
  for (const { line, raw, inFence } of annotated) {
    if (inFence) continue;
    if (INLINE_IGNORE.test(raw) || WCAG3_INLINE_IGNORE.test(raw)) continue;
    if (WCAG3_NEGATIVE_CONTEXT.test(raw)) continue;
    const scanned = stripInlineCode(raw);
    for (const entry of WCAG3_BANNED_PHRASES) {
      const re = new RegExp(entry.pattern, "iu");
      if (re.test(scanned)) {
        findings.push({
          file: label,
          line,
          phrase: entry.phrase,
          id: entry.id,
          text: raw.trim(),
        });
      }
    }
  }
  return findings;
}

async function scanTargets(targets, rootDir) {
  const violations = [];
  const missing = [];
  for (const rel of targets) {
    const abs = path.resolve(rootDir, rel);
    if (!existsSync(abs)) {
      missing.push(rel);
      continue;
    }
    const body = await readFile(abs, "utf8");
    violations.push(...findViolations(body, rel));
  }
  return { violations, missing };
}

async function walkFiles(dir, predicate, acc = []) {
  if (!existsSync(dir)) return acc;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === ".next" ||
        entry.name === "coverage"
      ) {
        continue;
      }
      await walkFiles(abs, predicate, acc);
    } else if (entry.isFile() && predicate(abs)) {
      acc.push(abs);
    }
  }
  return acc;
}

/**
 * Collect RR-CF-001 scan targets under docs/, src/, _specialist_packets/.
 */
export async function collectWcag3Targets(rootDir = REPO_ROOT) {
  const docs = await walkFiles(path.join(rootDir, "docs"), (abs) =>
    abs.endsWith(".md"),
  );
  const src = await walkFiles(path.join(rootDir, "src"), (abs) =>
    /\.(ts|tsx)$/.test(abs),
  );
  const packets = await walkFiles(
    path.join(rootDir, "_specialist_packets"),
    (abs) => abs.endsWith(".json"),
  );
  return [...docs, ...src, ...packets]
    .map((abs) => path.relative(rootDir, abs))
    .sort();
}

export async function runClaimLint({
  rootDir = REPO_ROOT,
  targets = DEFAULT_TARGETS,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  const { violations, missing } = await scanTargets(targets, rootDir);

  if (missing.length > 0) {
    stderr.write(
      `claim-lint: missing target(s): ${missing.join(", ")}\n`,
    );
  }

  if (violations.length === 0 && missing.length === 0) {
    stdout.write(
      `claim-lint: ok — 0 banned phrases in ${targets.length} buyer-facing docs (ADR-S-001, R-005).\n`,
    );
    return 0;
  }

  for (const v of violations) {
    stderr.write(
      `claim-lint: BANNED "${v.phrase}" (${v.id}) at ${v.file}:${v.line}\n  ${v.text}\n`,
    );
  }
  stderr.write(
    `claim-lint: FAILED — ${violations.length} violation(s), ${missing.length} missing target(s). See ADR-S-001 and docs/regulatory-posture-boundary.md.\n`,
  );
  return 1;
}

export async function runWcag3ClaimLint({
  rootDir = REPO_ROOT,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  const targets = await collectWcag3Targets(rootDir);
  const violations = [];

  for (const rel of targets) {
    const abs = path.resolve(rootDir, rel);
    const body = await readFile(abs, "utf8");
    violations.push(...findWcag3Violations(body, rel));
  }

  if (violations.length === 0) {
    stdout.write(
      `check-wcag3-claims: ok — 0 WCAG 3 conformance verbs in ${targets.length} files (RR-CF-001 / AC-CF-A003).\n`,
    );
    return 0;
  }

  for (const v of violations) {
    stderr.write(
      `check-wcag3-claims: BANNED "${v.phrase}" (${v.id}) at ${v.file}:${v.line}\n  ${v.text}\n`,
    );
  }
  stderr.write(
    `check-wcag3-claims: FAILED — ${violations.length} violation(s). See ADR-UX-007 §8 / RR-CF-001.\n`,
  );
  return 1;
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  const mode = process.argv.includes("--wcag3") ? "wcag3" : "default";
  const runner = mode === "wcag3" ? runWcag3ClaimLint : runClaimLint;
  runner()
    .then((code) => {
      process.exit(code);
    })
    .catch((err) => {
      process.stderr.write(
        `${mode === "wcag3" ? "check-wcag3-claims" : "claim-lint"}: crashed ${err?.stack ?? err}\n`,
      );
      process.exit(2);
    });
}
