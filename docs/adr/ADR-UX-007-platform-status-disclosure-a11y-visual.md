# ADR-UX-007: Platform status disclosure, a11y topology, and visual evidence

**Status:** Accepted (adversary-reviewed)  
**Date:** 2026-07-19  
**Program:** `ehs` / Calm Focus Gen-1 (`calm-focus-gen-1`, corporate handoff revision 1)  
**Packet:** PKT-CF-ADR-007-AUTHOR  
**Requirements:** Platform status disclosure re-style; progressive disclosure for long banner bodies; visual Playwright scaffold; screenshot digest contract; a11y re-run + motion guards; first-PR residual **RR-CF-001** (describe only)  
**Acceptance:** AC-CF-R003, AC-CF-H001, AC-CF-H002, AC-CF-A001, AC-CF-A003, AC-CF-A005, AC-CF-V007, AC-CF-V008, AC-CF-V010, AC-CF-S003, RR-CF-001  
**Depends on:** ADR-UX-002 (sole shell + tokens + honesty banners), ADR-UX-004 (dedicated `a11y` Playwright project topology)  
**Closes (design decision):** UR-CF-003 (component vs CSS-only for `ModuleMaturityBanner` Calm Focus re-style)  
**Does not close:** UR-CF-007 (brand test — named human reviewer required; cannot self-close)

## Context

Calm Focus is a visual + density overhaul on the R1 shell. It must not alter Today/Capture/Decide/Prove IA, core-spine URLs, or honesty non-negotiables. Corporate handoff and master-spec §5.2 / §9 require **ADR-UX-007** before any product implementation:

1. Re-style `ModuleMaturityBanner` into the Calm Focus palette without reducing semantic weight or plumbing prominence.
2. Add a **visual** Playwright project separate from `@smoke` and `a11y`.
3. Record a screenshot + sha256 manifest contract.
4. Bind a11y re-run, touch, outbox landmark, safe-area, and `prefers-reduced-motion` policies to the token change surface.
5. Keep inherited R1 honesty gates green; forbid WCAG 3 conformance claims; forbid Plumbing→Core via polish.

R1 left **UR-CF-003** open: whether the banner re-style is CSS-only or a component change, and whether contrast / prominence remain compliant after the Calm Focus palette.

This ADR records those decisions at acceptance depth. **Adversary disposition PASS_WITH_NOTES recorded 2026-07-19** (G-CF-ADR-003 / AC-CF-R003). No product, test, or CI implementation lands in this packet.

## Decision

### 1. UR-CF-003 resolved — component change (not CSS-only)

**Decision:** Calm Focus `ModuleMaturityBanner` work is a **component change** in `src/components/dashboard/module-maturity-banner.tsx`, consuming Calm Focus tokens from ADR-UX-005 (`globals.css` / `@theme inline`). A CSS-only restyle of the existing Tailwind class strings is **rejected**.

**Rationale:**

| Factor | Why component change |
|--------|----------------------|
| Progressive disclosure | Long body text needs a `<details>` wrapper with `data-maturity-disclosure` (master-spec §5.2) — markup, not stylesheet alone |
| Tier prominence | Plumbing ≥ connected requires tier-aware border / accent mapping that the component already owns via `tier` prop |
| Honesty invariant | `role="note"` and `data-maturity-banner={tier}` must stay on the banner root; component is the single enforcement point |
| Token source | Colours still resolve through ADR-UX-005 tokens / Tailwind theme — no hardcoded hex proliferation in JSX beyond tokenized utilities |

**Out of scope for CSS-only:** Removing the banner, hiding it with `display:none`, or restyling via a global selector that strips `role="note"` semantics.

### 2. `ModuleMaturityBanner` permitted / forbidden re-style matrix

Canonical Calm Focus chrome for the banner body (handoff + master-spec §3.4 / §5.2):

| Token / treatment | Value / rule |
|-------------------|--------------|
| Background | `slate-100` (or token equivalent mapped in ADR-UX-005) |
| Text | `slate-700` (or token equivalent; body contrast ≥4.5:1 on banner bg) |
| Left accent border | `teal-600` for connected / intake calm framing |
| Semantics | `role="note"` **preserved** on every instance |
| Identity attrs | Keep `data-maturity-banner={tier}` |
| Typography | UI font only (Source Sans 3 / IBM Plex Sans) — **no Fraunces** on banner headings or tier labels (AC-CF-H005 / CF-OVERSELL-003) |

#### Permitted

| # | Change |
|---|--------|
| P1 | Update padding, radius, font-size using Calm Focus `--*` density tokens |
| P2 | Apply slate-100 / slate-700 / teal-600 left-border calm palette via tokenized utilities |
| P3 | For `connected` and `intake` tiers, wrap long body (>2 lines) in `<details>` with `data-maturity-disclosure` on the wrapper |
| P4 | Keep banner visible by default on Banner=Yes routes and Prove secondary surfaces |
| P5 | Plumbing left/border treatment may use `--warning` or stronger so prominence ≥ connected |

#### Forbidden

| # | Change |
|---|--------|
| F1 | Remove or omit `role="note"` |
| F2 | Visually de-emphasise **plumbing** relative to **connected** (plumbing prominence **≥** connected; border saturation same or higher) |
| F3 | Auto-dismiss, animate-away, or time-hide any banner |
| F4 | Add a close / dismiss button (requires separate corporate promotion + counsel gate — out of scope) |
| F5 | Reduce semantic content or visible text of any banner |
| F6 | Hide, collapse-by-default, or omit banner on Prove secondary / Banner=Yes routes |
| F7 | Use `--success` / teal wash as card background implying filing-ready on Plumbing surfaces (AC-CF-H004) |
| F8 | Plumbing→Core promotion via visual polish |

**Plumbing ≥ connected (binding):** Connected may use teal-600 left border on slate-100. Plumbing must not be quieter: border-color references `--warning` (or stronger warning token), not a muted slate-only edge. Gate: AC-CF-V008 / G-CF-VISUAL-BANNERS.

### 3. Platform status progressive disclosure (long banner body)

When banner body text exceeds **two lines** at the desktop content width:

1. Wrap the expandable body in `<details data-maturity-disclosure>` (summary remains always visible).
2. Default open state: **closed** for the long body only; the summary line must still communicate tier honesty (e.g. Connected / Plumbing label + first-line summary).
3. Semantic weight must not drop: `role="note"` stays on the outer banner root (not inside collapsed content only); screen readers still expose the note landmark.
4. No motion required to open/close beyond native `<details>`; if any transition is added later, it must carry a `prefers-reduced-motion` guard (see §6).
5. Applies to `connected` and `intake` per master-spec §5.2; plumbing may use the same pattern but must remain at least as prominent when collapsed summary is shown.

### 4. Visual Playwright scaffold — AC-CF-S003

| Item | Contract |
|------|----------|
| Path | `tests/e2e/visual/**/*.spec.ts` |
| Playwright project | `visual` in `playwright.config.ts` matching that glob |
| Separation | **Not** inside `@smoke` / `./scripts/integration-e2e.sh`; **not** inside the `a11y` project |
| CI order | After a11y step; dedicated visual step (or job step) — smoke duration stays bounded |
| Diffing | Repo-local screenshots + sha256 manifest; no third-party hosted visual diff service required for Gen-1 |
| Forbidden | Screenshot captures added to `@smoke` specs |

### 5. Screenshot + sha256 manifest contract — AC-CF-V010

| Item | Contract |
|------|----------|
| Manifest path (preferred) | `evidence/calm-focus-visual-manifest.json` |
| Alternate harness path | `.corp-harness/evidence/calm-focus-visual-manifest.json` (acceptable if site evidence root is harness-scoped; promote packet must cite the path used) |
| Canonical surfaces (4) | (1) desk_contributor Today collapsed 1440×900; (2) desk_supervisor Today collapsed 1440×900; (3) desk_supervisor Today KPI expanded 1440×900; (4) field Today 1440×900 **or** 390×844 per R-CF-PL-007 |
| Manifest fields | Non-empty `sha256` per surface id; relative screenshot paths; viewport metadata |
| Human review | Reviewer confirms S1/S2 show no metric grid; S3 shows metric grid; S4 shows large field launcher CTAs — recorded at promotion (not self-attested by implementer alone) |

Example shape (illustrative — not implemented here):

```json
{
  "program": "ehs-ux",
  "cycle": "calm-focus-gen-1",
  "surfaces": [
    { "id": "desk_contributor_today_collapsed", "viewport": "1440x900", "path": "evidence/visual/….png", "sha256": "<hex>" },
    { "id": "desk_supervisor_today_collapsed", "viewport": "1440x900", "path": "evidence/visual/….png", "sha256": "<hex>" },
    { "id": "desk_supervisor_today_kpi_expanded", "viewport": "1440x900", "path": "evidence/visual/….png", "sha256": "<hex>" },
    { "id": "field_today", "viewport": "390x844", "path": "evidence/visual/….png", "sha256": "<hex>" }
  ]
}
```

Chrome quietness (AC-CF-V007) is verified via the same visual lane / human review: nav subordinate to content; no dual sticky bars; no gradient hero in content.

### 6. A11y re-run policy (post–Calm Focus tokens)

Builds on ADR-UX-004 dedicated `a11y` project — does not merge axe into smoke.

| Gate | Policy |
|------|--------|
| AC-CF-A001 | `npx playwright test --project=a11y` ≥ **9/9** passed; **0** new serious/critical axe violations on all Calm Focus token-changed surfaces (desk Today, Capture entry, Decide, Prove, field home, incident create). Tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` |
| Touch | Field primary actions remain ≥ **44×44** CSS px (AC-CF-A004 / WCAG 2.5.8); `.touch-target` min-height ≥ 2.75rem preserved |
| Outbox | `#field-outbox-status` (`role="region"` Offline sync queue) **unaffected** — not occluded, not `display:none` / `visibility:hidden` by new Calm Focus rules (AC-CF-A006) |
| Safe-area | `viewportFit: 'cover'` and `env(safe-area-inset-*)` padding **unchanged** (AC-CF-A005) |
| AC-CF-A003 | No WCAG 3 conformance verbs in deliverables (see §8 RR-CF-001) |
| Evidence | `evidence/calm-focus-a11y-[hash].txt` with route URL, tag set, pass/fail |

### 7. Motion — `prefers-reduced-motion` and MO-1..MO-3 ownership vs ADR-UX-005

| Beat | Owner of *spec* | Owner of *implementation surface* |
|------|-----------------|-------------------------------------|
| MO-1 queue exit | This ADR (budget + a11y guards) | Today queue components (Calm Focus PR) |
| MO-2 outbox pulse | This ADR | Status region / outbox indicator (must not break `#field-outbox-status`) |
| MO-3 modal enter | This ADR | Decision / confirmation / detail panels |

**ADR-UX-005** owns tokens, typography, and chrome colours/density. It may expose duration/easing custom properties if needed, but **must not** expand the motion budget beyond MO-1..MO-3.

**ADR-UX-007** owns:

- Exclusive beat set MO-1..MO-3 for Calm Focus (AC-CF-V009)
- Mandatory `@media (prefers-reduced-motion: reduce)` guards on every new `transition`, `animation`, or `@keyframes` (AC-CF-A007)
- Forbidden motion list from master-spec §3.5 (field focus thrash, hover-everywhere, parallax, ungarded landmark animation)
- A11y / visual evidence that reduced-motion does not degrade function

### 8. RR-CF-001 — WCAG 3 claim lint (first-PR residual; describe only)

**Binding residual (blocking for Calm Focus acceptance):** Gen-1 left WCAG 3 claim lint out of CI (UR-CF-009 / Q-R007-CLAIM-LINT-WCAG3). Calm Focus **first implementation PR** must close **RR-CF-001**. This ADR **does not implement** the script or CI wiring.

| Item | First-PR requirement (description) |
|------|-------------------------------------|
| Script | Add `scripts/check-wcag3-claims.sh` (or equivalent) that greps forbidden phrases and exits non-zero on match |
| Forbidden phrases | `WCAG 3 conformant`, `WCAG 3 certified`, `meets WCAG 3`, `compliant with WCAG 3`, `WCAG 3 compliant`, `WCAG 3.0 conformant`, `WCAG 3.0 certified` |
| Scope | `docs/**/*.md`, `src/**/*.{ts,tsx}`, `_specialist_packets/*.json` |
| Disclaimer carve-out | Any WCAG 3 readiness note only in an explicitly labelled section stating: *WCAG 3 conformance is not claimed; this is design intent only.* |
| CI wiring | Invoke from verify / `e2e-smoke` (or dedicated claim step) so Calm Focus PRs fail closed; record `evidence/calm-focus-claim-lint-[hash].txt` |
| Gate | AC-CF-A003 / G-CF-RR-001 |

Existing `scripts/claim-lint.mjs` honesty lint remains green (AC-CF-H001 / H002); RR-CF-001 is the **additional** WCAG 3-specific gate.

### 9. Inherited honesty and non-claims (binding)

| Rule | Binding statement |
|------|-------------------|
| R1 honesty | `module-maturity-check`, `claim-lint`, AI non-transition tests remain green after Calm Focus (AC-CF-H001) |
| Empty states | No AI autonomy, filing-ready, or native-app language (AC-CF-H002) |
| WCAG 3 | **No** WCAG 3 conformance or certification claims |
| Plumbing→Core | **No** promotion via polish; counsel + promotion packet still required |
| D-006 / D-010 | Remain blocked |
| Dismiss control | **No** dismiss button on maturity banners in this cycle |

### 10. UR-CF-007 — brand test (cannot self-close)

**AC-CF-V006 / G-CF-BRAND-TEST** requires a **named human reviewer** designated by the product owner. This ADR and its author **cannot** close UR-CF-007. Site implementation may prepare screenshot digests; sign-off authority remains a human designation outside this packet.

## Consequences

- Pre-implementation gate **G-CF-ADR-003** is adversary-cleared with ADR-UX-005 and ADR-UX-006; implementation of banners / visual / a11y may proceed under the recorded contracts.
- Implementers change `ModuleMaturityBanner` (component) + consume ADR-UX-005 tokens; they do not invent a parallel banner or dismiss affordance.
- CI gains a third Playwright lane (`visual`) beside smoke and a11y; smoke stays bounded.
- First Calm Focus PR must land **RR-CF-001** (`check-wcag3` + CI) as a blocking residual — tracked here, implemented later.
- Brand test (UR-CF-007) stays open until a named human reviewer is designated.

## Acceptance criteria map

| ID | How this ADR binds it |
|----|------------------------|
| **AC-CF-R003** | This file at `docs/adr/ADR-UX-007-platform-status-disclosure-a11y-visual.md` with required sections; adversary PASS_WITH_NOTES recorded (§ Adversary review) |
| **AC-CF-H001** | §9 — R1 honesty gates remain green; no Plumbing→Core via polish |
| **AC-CF-H002** | §9 — empty-state / claim honesty preserved alongside RR-CF-001 |
| **AC-CF-A001** | §6 — axe ≥9/9; 0 new serious/critical on token-changed surfaces |
| **AC-CF-A003** | §8 — WCAG 3 claim lint residual RR-CF-001 described for first PR |
| **AC-CF-A005** | §6 — safe-area / `viewportFit` unchanged |
| **AC-CF-V007** | §5 — chrome quietness via visual lane + human review |
| **AC-CF-V008** | §2 — banner matrix; `role=note`; plumbing ≥ connected; no dismiss |
| **AC-CF-V010** | §5 — four screenshots + sha256 manifest contract |
| **AC-CF-S003** | §4 — `tests/e2e/visual/**/*.spec.ts` separate from `@smoke` and a11y |
| **RR-CF-001** | §8 — `check-wcag3` script + CI wiring as first-PR residual (not implemented in this packet) |

Related (owned here for policy, evidenced in implementation PRs): AC-CF-A004 (touch), AC-CF-A006 (outbox), AC-CF-A007 / AC-CF-V009 (motion).

## Adversary review

Falsification checklist (confirmed 2026-07-19):

1. Banner re-style cannot reduce plumbing prominence below connected or strip `role="note"` — bound in §2 F1–F2 / P5.
2. Progressive disclosure (`<details>`) does not hide honesty content from AT / semantics — §3 keeps `role="note"` on outer root; summary retains tier honesty.
3. Visual project separation does not weaken `@smoke` or `a11y` — §4 / inherits ADR-UX-004.
4. Manifest sha256 contract requires human review at promotion — §5.
5. RR-CF-001 described for first-PR without WCAG 3 conformance claims — §8.
6. No dismiss control or Plumbing→Core path — §2 F4/F8, §9.
7. UR-CF-007 remains explicitly open — §10.

| Field | Value |
|-------|-------|
| Disposition | **PASS_WITH_NOTES** |
| Reviewer | `site-adr-adversary` |
| Date | 2026-07-19 |
| Notes / findings | (1) Long-body `<details>` closed-by-default is allowed only for body copy — banner chrome + tier summary must stay visible (CR-4 “not collapsed” vs §5.2 disclosure). (2) Motion: this ADR owns reduced-motion / MO-1..MO-3 evidence; ADR-UX-005 must not invent MO-4+. (3) RR-CF-001 and UR-CF-007 remain open for first-PR / human brand reviewer. Evidence: `.corp-harness/evidence/adr-ux-007-adversary-review.txt`. G-CF-ADR-003 clear alongside 005/006. |

## Evidence (expected after implementation — not produced by this packet)

| Artifact | Path |
|----------|------|
| This ADR | `docs/adr/ADR-UX-007-platform-status-disclosure-a11y-visual.md` |
| Visual manifest | `evidence/calm-focus-visual-manifest.json` (or `.corp-harness/evidence/…`) |
| A11y digest | `evidence/calm-focus-a11y-[hash].txt` |
| Claim lint digest | `evidence/calm-focus-claim-lint-[hash].txt` |
| Banner / cohesion | module-maturity-check + G-CF-VISUAL-BANNERS screenshots |
| Adversary sign-off | Notation in this ADR’s Adversary review table or companion evidence packet |
