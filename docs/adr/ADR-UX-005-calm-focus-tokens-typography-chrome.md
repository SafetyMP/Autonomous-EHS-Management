# ADR-UX-005: Calm Focus tokens, typography, and chrome quietness

**Status:** Accepted (adversary-reviewed)  
**Date:** 2026-07-19  
**Program:** `ehs` / Calm Focus Gen-1 (corporate handoff cycle `calm-focus-gen-1`)  
**Requirements:** CR-2, CR-3, CR-6; master-spec §3.1–3.5, §9 ADR-UX-005; G-CF-ADR-001  
**Acceptance:** AC-CF-R001, AC-CF-V001, AC-CF-V002, AC-CF-V003, AC-CF-V004, AC-CF-V005, AC-CF-V006, AC-CF-A002, AC-CF-LEARN002  
**Depends on:** ADR-UX-002 (sole shell composition, Tailwind 4 token layer in `globals.css`, no new UI kit)

## Adversary review

| Field | Value |
| --- | --- |
| Disposition | **PASS_WITH_NOTES** |
| Reviewer | `site-adr-adversary` |
| Date | 2026-07-19 |
| Notes / residual risks | (1) White-on-`--primary` (~3.74:1) is UI/large-text only — forbid 13px caption use of `--primary-fg` on teal. (2) Keyframe *definitions* may land with tokens only for MO-1..MO-3; reduced-motion guards + motion audit evidence remain ADR-UX-007. (3) UR-CF-007 brand-test human reviewer still open (not owned by this ADR). Evidence: `.corp-harness/evidence/adr-ux-005-adversary-review.txt`. G-CF-ADR-001 clear alongside 006/007. |

## Context

R1 (ADR-UX-001…004) delivered task-first IA, sole shell composition, RBAC-honest chrome, and a token layer — but the console still reads as a generic emerald/zinc + Geist SaaS surface. Calm Focus Gen-1 answers visual dislike and learnability complaints **without** changing Today / Capture / Decide / Prove IA or core-spine URLs.

Corporate master-spec (CR-2, CR-3) and `corporate-handoff.json` bind this ADR to:

1. Retire emerald brand accents and zinc-as-hero neutrals in favour of a slate/stone atmosphere with restrained safety teal / forest accents.
2. Load Fraunces (display) + Source Sans 3 or IBM Plex Sans (UI) via `next/font/google` only.
3. Quiet chrome so the content card is the lightest, most prominent layer; scope Calm Focus overrides with `data-theme="calm"`.
4. Record five new CSS custom properties and an `@theme inline` bridge before any implementation PR.

This document ratifies concrete token hex values, typography loading, chrome rules, forbidden palette items, and ownership boundaries vs ADR-UX-007 for motion. **Adversary disposition PASS_WITH_NOTES recorded 2026-07-19** (see Adversary review).

## Decision

### 1. Ratified brand accent tokens (AC-CF-V003 / CR-3)

Calm Focus **overrides** the R1 emerald frozen-identity assumption. Brand identity for Gen-1 is safety teal / forest — not emerald.

| Token | Ratified value (light / default `:root`) | Role |
| --- | --- | --- |
| `--primary` | `#0d9488` (teal-600) | Filled primary CTAs, active mode accent stripe / icon tint |
| `--primary-hover` | `#0f766e` (teal-700) | Hover / pressed primary |
| `--primary-fg` | `#ffffff` | Text/icons on filled primary |
| `--primary-soft` | `#f0fdfa` (teal-50) | Soft primary surfaces (e.g. `.btn-primary-soft` ground) |
| `--primary-soft-border` | `#0d9488` | Soft primary border aligned to `--primary` |
| `--focus` | `#0f766e` (teal-700) | Focus rings and safety-positive emphasis (slightly darker than `--primary`) |
| `--success` | `#0f766e` (teal-700) | **Actual** task completion only (submitted, verified, sync success) — never decorative |

**Dark-surface companion (nav rail / dark chrome accents only):** `--primary` accent on slate-800/900 may use `#2dd4bf` (teal-400) for icon/stripe readability; document any dark override under `[data-theme="calm"]` on the dark chrome subtree, not as a second global brand.

**Unchanged from R1 baseline (binding):**

| Token | Keep |
| --- | --- |
| `--danger` | `#b91c1c` (and existing `--danger-surface`) |
| `--warning` | `#b45309` (and existing `--warning-surface`) |

#### Atmosphere pairing (slate / stone)

| Token | Ratified direction | Concrete CSS |
| --- | --- | --- |
| `--background` | Page ground | `#f8fafc` (slate-50); stone-50 `#fafaf9` acceptable alternate |
| `--surface` | Content card (lightest layer) | `#ffffff` |
| `--surface-muted` | Section / banner ground | `#f1f5f9` (slate-100) |
| `--foreground` | Body text | `#0f172a` (slate-900) |
| `--text-muted` | Secondary copy | `#475569` (slate-600) — must keep ≥4.5:1 on `--surface-muted` and `--surface` |
| Nav rail background | Dark anchor | `#1e293b` / `#0f172a` (slate-800 / slate-900) |
| Non-active nav text | Subordinate | `#94a3b8` (slate-400) |

#### WCAG 2.2 AA contrast notes (AC-CF-A002 / AC-CF-V003)

Binding target: **WCAG 2.2 AA** (axe tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`). **WCAG 3 conformance is not claimed.**

| Pairing | Approx. contrast | Binding use |
| --- | --- | --- |
| `--foreground` `#0f172a` on `--surface` `#ffffff` | ≥12:1 | Body / form / table copy (meets ≥4.5:1) |
| `--text-muted` `#475569` on `--surface` / `--surface-muted` | ≥4.5:1 on white; verify ≥4.5:1 on slate-100 | Captions / meta; forbid zinc-400/500 instructional copy on light grounds |
| `--primary-fg` `#ffffff` on `--primary` `#0d9488` | ~3.4:1 | UI components & large/bold control labels (≥3:1 UI component / large text). Primary CTA label must remain ≥14px semibold (or larger) so the AA large-text/UI path applies; do not use white-on-teal for 13px caption text |
| `--primary` `#0d9488` on `--background` `#f8fafc` | ≥3:1 | Icons, borders, active indicators on page ground (AC-CF-V003 axe re-run) |
| `--focus` `#0f766e` focus ring on white | ≥3:1 | Visible focus indicator against content cards |
| Active teal stripe on nav slate-800/900 | Use teal-400 `#2dd4bf` if teal-600 fails ≥3:1 on dark rail | Mode active state only |
| `--danger` / `--warning` on light surfaces | Unchanged R1 pairs | Urgency only — not re-tuned in this ADR |

**Glare assumption:** Field / high-glare review uses `docs/qa/glare-contrast-checklist.md`; implementers must add Calm Focus token names to that checklist when CSS lands (AC-CF-A002 evidence). Decorative teal washes on content cards are forbidden because they both fail brand restraint and create false “safe / filing-ready” signals on Plumbing surfaces.

### 2. Five new CSS custom properties + `@theme inline` bridge (AC-CF-V004)

Add to `src/app/globals.css` `:root` (and calm-scoped overrides if needed) and **bridge every property** in the existing `@theme inline` block so Tailwind utilities can consume them (ADR-UX-002 token-layer contract).

| Property | Ratified value | Purpose |
| --- | --- | --- |
| `--surface-elevated` | `#ffffff` | Elevated card / panel surface distinct from `--surface-muted` |
| `--radius-card` | `0.75rem` | Uniform border-radius for cards / panels |
| `--shadow-card` | `0 1px 3px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.04)` | Low elevation (≤4px y-offset) |
| `--spacing-section` | `2rem` | Vertical gap between major dashboard sections |
| `--density-nav-item` | `0.5rem 0.75rem` | Sidebar nav item padding (`block` `inline`) |

**Bridge requirement:** For each of the five, expose a `@theme inline` mapping (e.g. `--color-surface-elevated`, `--radius-card`, `--shadow-card`, spacing/density theme keys as appropriate to the Tailwind 4 patterns already used for `--color-primary`). No Calm Focus visual property may be introduced as a hardcoded hex / rgba literal in component `className` strings outside `:root` / theme bridge.

### 3. Forbidden palette & aesthetic items (AC-CF-V005 / AC-CF-V006 / CR-3)

| Forbidden | Rationale |
| --- | --- |
| Emerald as brand accent (`emerald-*`, prior `#065f46` / `#059669` primary/focus family) | Retire generic SaaS “startup green” hero aesthetic |
| Zinc as hero neutral (zinc page ground, zinc-500 instructional hero copy) | “Flat generic console” complaint; prefer slate/stone |
| Purple-on-white / purple-to-indigo gradients as brand | Explicitly excluded as `--primary` / `--focus` candidates |
| Terracotta / warm-cream serif brochure look as brand | Excluded from Calm Focus industrial-trust direction |
| Status colours (red / amber / teal) on neutral completed rows | Urgency signalling only (AC-CF-V005) |
| Teal background wash on Plumbing / Connected content cards | Prevents false Core / filing-ready read (honesty) |
| Hardcoded Calm Focus hex in JSX `className` outside tokens | Breaks `@theme inline` single source of truth |
| Gradient hero bars in the **content** region | Chrome quietness; subtle nav-rail gradient only is optional |
| Dual sticky bars / glassmorphic nav | Content must remain focal |

**Brand-test heuristics (AC-CF-V006)** — side-by-side review of incident create, Today queue, and Decide approval card must pass all three for desk and field viewports:

1. Reads as trustworthy safety tooling (industrial slate/stone + restrained teal).
2. Status colours read as urgency, not decoration.
3. Nav is visually quieter than the content region.

### 4. Typography — Fraunces + Source Sans 3 (AC-CF-V001 / AC-CF-V002 / CR-2)

| Usage | Family | Size / weight | Loading |
| --- | --- | --- | --- |
| Mode-entry H1 (Today, Capture, Decide, Prove) | **Fraunces** (variable serif) | ≥28px; one H1 per view | `next/font/google` → `Fraunces` |
| Section H2 | **Source Sans 3** (preferred) or **IBM Plex Sans** (acceptable) | 18–22px medium/semibold | `next/font/google` → `Source_Sans_3` and/or `IBM_Plex_Sans` |
| Body, forms, tables | Source Sans 3 / IBM Plex Sans | 15–16px regular | same |
| Caption / label / meta | Source Sans 3 / IBM Plex Sans | 13–14px regular; ≥4.5:1 | same |
| Code / mono | Geist Mono | unchanged | existing |

**Loading contract:**

- Import fonts only from `next/font/google` in `src/app/layout.tsx` (or the single root layout that already hosts font CSS variables).
- Inject CSS variables on `<html>` per `next/font` convention; wire display/UI families into Calm Focus type tokens / utility classes.
- **Forbidden:** `<link rel="preload">` / `<link rel="stylesheet">` font tags; CDN / runtime `fetch()` font loading; Inter, Roboto, Arial, or system-ui as hero display or body faces; Geist Sans as the sole or hero face at display or body scales.
- Fraunces is **mode-entry H1 only** — not module tier labels, maturity banner headings, or Plumbing/Connected programme-aid headings (honesty / CF-OVERSELL-003).

### 5. Chrome quietness + `data-theme="calm"` (AC-CF-V006 hierarchy / master-spec §3.4)

| Chrome element | Rule |
| --- | --- |
| Nav rail | Background slate-800/900; active mode teal stripe or icon tint; non-active slate-400 text; no glass effect; no content-region hero gradient |
| Header bar | Height **48–56px**; no hero gradient strip; mode label + org context + user affordances only — no module-tile grid |
| Content region | White / elevated card on slate-50 ground — **lightest** layer above the fold |
| Theme scope | `data-theme="calm"` on `<html>` or dashboard root for scoped token overrides |
| Shell tree | Unchanged: `dashboard/layout.tsx` → `DashboardChrome` → `DashboardShell` → `DashboardAuthenticatedLayout` (ADR-UX-002). No parallel layout, no `CalmFocusDashboardLayout` |
| IA / URLs | **Do not alter** Today / Capture / Decide / Prove labels, mode count, or core-spine deep-link hrefs |

### 6. Motion budget ownership boundary (vs ADR-UX-007)

Calm Focus allows **at most** the three intentional beats defined in master-spec §3.5:

| ID | Beat | Owner for implementation detail & evidence |
| --- | --- | --- |
| MO-1 | Queue row exit (~150ms ease-out) | Token/chrome PR may add shared keyframes **only if** named for these IDs; executable reduced-motion guards + audit evidence close under **ADR-UX-007** |
| MO-2 | Outbox status pulse (~2s loop while pending) | Same boundary |
| MO-3 | Modal / panel enter (fade + translate-y 8px, ~120ms) | Same boundary |

**This ADR (005)** owns: declaring that no additional motion vocabulary is part of the Calm Focus visual system (no focus/blur field motion, no hover-everywhere, no parallax/scroll-linked animation, no spin/bounce on primary intake paths).

**ADR-UX-007** owns: `prefers-reduced-motion` guard requirements, Playwright reduced-motion assertions, motion audit checklist evidence, and a11y/visual project wiring. Implementers must not invent MO-4+ under a “polish” rationale.

### 7. Learnability ladder visual enforcement (AC-CF-LEARN002)

Design (pre-implementation) checkpoints this ADR binds for LL-1…LL-3:

| Ladder | Visual / IA rule owned here |
| --- | --- |
| LL-1 | Unique Fraunces mode H1 (≥28px) on Today, Capture entry, Decide, Prove — four modes recognisable without reading module tiles |
| LL-2 | Today empty state: exactly one primary CTA pointing to Capture (token helpers `.btn-primary` / `.btn-primary-soft` per ADR-UX-002) |
| LL-3 | Today queue rows that are actioned carry a mode context indicator (mode badge) — typography uses UI font, not Fraunces |

Closing learnability UAT rows remains a human evidence step; this ADR requires the visual rules above to be designed before Status advances past adversary review.

## Acceptance mapping

| ID | How this ADR satisfies the observable design contract |
| --- | --- |
| **AC-CF-R001** | This file at `docs/adr/ADR-UX-005-calm-focus-tokens-typography-chrome.md` with Status Accepted (adversary-reviewed); fonts, ratified `--primary`/`--focus`, five properties, forbidden palette, and Adversary review sign-off present |
| **AC-CF-V001** | §4 — Fraunces + Source Sans 3 / IBM Plex Sans via `next/font/google` only; no `<link>`/CDN |
| **AC-CF-V002** | §4 — Display H1 ≥28px Fraunces; body 15–16px UI font; Geist not sole hero face |
| **AC-CF-V003** | §1 — `#0d9488` / `#0f766e` ratified; `--danger`/`--warning` unchanged; WCAG notes for axe re-run |
| **AC-CF-V004** | §2 — five properties + `@theme inline` bridge requirement |
| **AC-CF-V005** | §3 — status colours urgency-only; no decorative emerald/green/teal washes |
| **AC-CF-V006** | §3 brand-test heuristics + §5 chrome quietness hierarchy |
| **AC-CF-A002** | §1 contrast table; glare checklist update required at implementation |
| **AC-CF-LEARN002** | §7 — LL-1…LL-3 visual rules recorded before ADR close |

## Consequences

- Implementation PRs that change `globals.css` / root layout fonts must match the ratified hex and font constructors in this ADR; drift fails AC-CF-V003 / AC-CF-V001.
- Emerald R1 primary/focus values are intentionally superseded; migration is a Calm Focus token PR, not a silent revert.
- IA, nav href authority (`dashboard-nav-links.ts`), and sole shell composition remain ADR-UX-002 / ADR-UX-001 — visual polish must not fork chrome or promote Plumbing into four-mode primary chrome.
- No site CSS/font/chrome code for Calm Focus lands until this ADR and ADR-UX-006 / ADR-UX-007 all have adversary **PASS** (G-CF-ADR-001…003).
- Motion beyond MO-1/MO-2/MO-3 is out of scope for “token polish” and is rejected in review.

## Evidence

| Artifact | Path / command |
| --- | --- |
| Corporate handoff (read-only) | `ehs-corporate-program/corporate-handoff.json` (cycle `calm-focus-gen-1`) |
| Acceptance criteria | `ehs-corporate-program/acceptance.json` → AC-CF-R001, AC-CF-V001…V006, AC-CF-A002, AC-CF-LEARN002 |
| Master spec | `ehs-corporate-program/master-spec.md` §3.2–3.5, §9 ADR-UX-005, CR-2, CR-3 |
| Prior shell/token ADR | [`ADR-UX-002-shell-tokens-rbac-honesty.md`](./ADR-UX-002-shell-tokens-rbac-honesty.md) |
| Adversary disposition | Section **Adversary review** above; `.corp-harness/evidence/adr-ux-005-adversary-review.txt` |
| Post-implementation (not this packet) | `globals.css` diff; `layout.tsx` font import audit; axe a11y digest; glare-contrast checklist update; brand-test sign-off |
