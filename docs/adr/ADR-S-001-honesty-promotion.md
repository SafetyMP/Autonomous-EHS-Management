# ADR-S-001: Honesty & promotion — capability map, lifecycle packet, anti-oversell claim lint

**Status:** Proposed (site delivery, revision 1)
**Date:** 2026-07-18
**Program:** `ehs` (corporate revision 1)
**Requirements:** R-001 (honest capability map), R-004 (lifecycle promotion criteria), R-005 (anti-oversell)
**Related:** [ADR 0000 Threat Model](0000-threat-model.md), [ADR 0001 MCP Context Sync](0001-mcp-context-sync-strategy.md)

**Not legal advice.** Marketing-claim language stays gated by counsel per
[`docs/regulatory-posture-boundary.md`](../regulatory-posture-boundary.md) and
[`COMPLIANCE.md`](../../COMPLIANCE.md).

## Context

The master spec ([`ehs-corporate-program/master-spec.md`](../../.corp-harness/site.json) → corporate root)
fixes the honesty and lifecycle discipline that keeps procurement, contracts,
and engineering aligned. Three requirements converge here:

- **R-001 Honest capability map.** Every marketed dashboard module must land in
  exactly one tier — `Core`, `Connected`, `Plumbing`, or `Gated`. The existing
  [`docs/module-maturity.md`](../module-maturity.md) enumerated **tiers by
  example**, but did not enumerate every routed module the sales/procurement
  surface can reference (e.g. `/dashboard/environmental-permits`,
  `/dashboard/rag`, `/dashboard/heat-program`, `/dashboard/moc`).
- **R-004 Lifecycle promotion packet.** Stage transitions **S1 → S4** require
  six executable artifacts. Marketing "Plumbing → Core" jumps without counsel
  exception must fail closed.
- **R-005 Anti-oversell claim discipline.** Banned marketing/legal phrases —
  "filing-ready", "agency SoR", "Tier2 Submit", "erase everything",
  "certification body", "OSHA-ready", "GDPR-compliant automated erasure",
  "autonomous AI EHS" — must not appear in `README.md`,
  `docs/procurement-readiness.md`, `docs/regulatory-posture-boundary.md`, or
  `COMPLIANCE.md`.

Absent an executable gate, this is enforced only by reviewer discipline. The
gap opens two failure modes:

1. A future PR silently elevates a Plumbing surface to Core positioning without
   the module-maturity + procurement-readiness §12 coupling the master spec
   requires.
2. Marketing rewrites drift into banned agency-SoR / filing-ready claims that
   `COMPLIANCE.md` and [`docs/regulatory-posture-boundary.md`](../regulatory-posture-boundary.md)
   explicitly forbid.

## Decision

Adopt an **executable honesty package** covering claim linting, per-module
maturity coverage, and a lifecycle promotion packet with fail-closed missing
artifacts.

### 1. Per-module maturity coverage

- [`docs/module-maturity.md`](../module-maturity.md) grows a **per-module row**
  table keyed on the sidebar `href` in
  [`src/lib/dashboard-nav-links.ts`](../../src/lib/dashboard-nav-links.ts).
- Each row commits to exactly one tier of `{Core, Connected, Plumbing, Gated}`,
  a lifecycle stage (`S1`–`S4`), whether a maturity banner is expected in the
  UI, and residual gaps.
- Executable check `scripts/module-maturity-check.mjs` parses the doc and:
  1. Ensures **every routed module** in `DASHBOARD_NAV_SECTIONS` has exactly
     one tier row.
  2. Fails when a PR touches `docs/module-maturity.md` without also touching
     [`docs/procurement-readiness.md`](../procurement-readiness.md) (§12 gap
     register) — enforced via a git-diff mode used by CI.
  3. Fails when a row combines a `Plumbing` or `Gated` tier with a `Core`
     lifecycle stage (`S4`) unless a counsel exception ID is captured.

### 2. Lifecycle promotion packet

New doc [`docs/lifecycle/promotion-packet.md`](../lifecycle/promotion-packet.md)
codifies the six required artifacts a promotion S1 → S4 must produce, with a
**fail-closed** checklist (missing artifact → stage blocked). Plumbing → Core
requires an explicit counsel exception ID plus the full packet.

### 3. Claim lint

`scripts/claim-lint.mjs` reads a banned-phrase list (documented in
[`docs/regulatory-posture-boundary.md`](../regulatory-posture-boundary.md)
"Acceptable vs prohibited contract phrases" and mirrored in the script header)
and greps the four buyer-facing surfaces:

- `README.md`
- `docs/procurement-readiness.md`
- `docs/regulatory-posture-boundary.md` (banned-phrase table is quoted in a
  **prohibited** column and marked with a fenced ignore block so the lint does
  not self-report)
- `COMPLIANCE.md`

Any bare occurrence — outside a quoted "prohibited" marker — exits non-zero.
The regex list is deliberately conservative and shared with unit tests to
prevent silent drift.

### 4. QA banner spot-check

[`docs/qa/promotion-packets/README.md`](../qa/promotion-packets/README.md)
records the manual spot-check procedure for Plumbing/Gated surfaces that must
retain maturity banners in the UI. Because the site-specialist scope
**excludes** `src/**`, this ADR captures the check-list only; the executable
UI assertion lands in a future ADR that owns those routes.

### 5. CI wiring

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) `verify` job runs
both scripts after `npm test`:

- `node scripts/claim-lint.mjs`
- `node scripts/module-maturity-check.mjs` (with `GITHUB_BASE_SHA` for the
  diff-coupling check on PRs)

Local parity: `scripts/verify.sh` is outside this ADR's write set, so
contributors invoke `node scripts/claim-lint.mjs` and
`node scripts/module-maturity-check.mjs` alongside `./scripts/verify.sh`
until a follow-up ADR that owns `scripts/verify.sh` inlines them.

## Consequences

**Positive**

- Sales / procurement / engineering see the same authoritative table; any tier
  change now updates two docs together or fails CI.
- Banned marketing phrases fail the pipeline, not just the reviewer.
- Lifecycle promotion becomes checklist-driven with counsel gating on
  regulated jumps.

**Negative / accepted trade-offs**

- The lint is intentionally string-based (grep) and can be evaded by paraphrase.
  It is a **floor**, not a semantic filter. Contract/marketing language reviews
  remain required.
- `docs/regulatory-posture-boundary.md` embeds banned phrases in a prohibited-
  column table. The lint script honours a `<!-- claim-lint:ignore --> ... <!--
  claim-lint:end -->` fence so the doc can keep documenting what is prohibited
  without self-triggering. Reviewers must not extend that fence into new prose.
- The `module-maturity-check.mjs` diff-coupling only runs when a base ref is
  available (CI PRs). Local `verify.sh` runs the presence + Plumbing/Core-stage
  invariants but skips the diff coupling.

## Out of scope (respect corporate boundary)

- No product code changes (`src/**`, `drizzle/migrations/**` excluded).
- No changes to `specs/threat-model.yaml`,
  `docs/qa/mutation-auditability-matrix.md`, `docs/roadmap/**`,
  `docs/barrier-resolution-playbook.md`, `docs/JOB_QUEUE.md`,
  `docs/runbooks/**`, `docs/DSAR_PROCESS.md`, `docs/ai-governed-intake.md`, or
  `.corp-harness/**` per ADR-S-001 write allow-list.
- No self-marking of `site_verify` or `operations` gates. The root orchestrator
  runs the gate commands; operations excellence reviews the evidence.

## References

- Corporate master spec (revision 1) requirements R-001, R-004, R-005
- [`docs/module-maturity.md`](../module-maturity.md)
- [`docs/procurement-readiness.md`](../procurement-readiness.md) §12
- [`docs/regulatory-posture-boundary.md`](../regulatory-posture-boundary.md)
- [`COMPLIANCE.md`](../../COMPLIANCE.md)
- [`docs/lifecycle/promotion-packet.md`](../lifecycle/promotion-packet.md)
