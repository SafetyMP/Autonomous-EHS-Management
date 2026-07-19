#!/usr/bin/env node
// ADR-S-001 (R-005) — anti-oversell claim lint.
// Fails non-zero when a banned marketing phrase appears in a buyer-facing doc
// outside a documented `<!-- claim-lint:ignore-start -->` fence.

import { readFile } from "node:fs/promises";
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

/** Buyer-facing docs the lint scans (paths relative to repo root). */
export const DEFAULT_TARGETS = Object.freeze([
  "README.md",
  "docs/procurement-readiness.md",
  "docs/regulatory-posture-boundary.md",
  "COMPLIANCE.md",
]);

const FENCE_START = /<!--\s*claim-lint:ignore-start\b[^>]*-->/i;
const FENCE_END = /<!--\s*claim-lint:ignore-end\b[^>]*-->/i;
const INLINE_IGNORE = /<!--\s*claim-lint:ignore-line\b[^>]*-->/i;

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

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  runClaimLint().then((code) => {
    process.exit(code);
  }).catch((err) => {
    process.stderr.write(`claim-lint: crashed ${err?.stack ?? err}\n`);
    process.exit(2);
  });
}
