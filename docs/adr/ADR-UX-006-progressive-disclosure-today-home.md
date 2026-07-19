# ADR-UX-006: Progressive disclosure contracts — Today home density

**Status:** Accepted (adversary-reviewed)  
**Date:** 2026-07-19  
**Program:** `ehs` / Calm Focus Gen-1 (corporate handoff cycle `calm-focus-gen-1`; master-spec revision 4)  
**Packet:** PKT-CF-ADR-006-AUTHOR  
**Depends on:** ADR-UX-001 (task-first IA), ADR-UX-002 (sole shell / stress CTA honesty)  
**Acceptance:** AC-CF-D001, AC-CF-D002, AC-CF-D003, AC-CF-D004, AC-CF-D005, AC-CF-D006, AC-CF-D007, AC-CF-D008, AC-CF-D009, AC-CF-R002  
**Residual (first-PR, not this packet):** RR-CF-006  
**Closes (design decision):** UR-CF-010  
**Out of scope / deferred:** UR-CF-011  

## Context

Calm Focus (master-spec §4–5, CR-4) requires hard density ceilings and progressive disclosure on the existing Today / Capture / Decide / Prove IA. R1 already established the four modes and sole shell composition; users still report overwhelm when KPI grids, activity feeds, and management panels compete with the action queue on first paint.

This ADR records the **contractual** progressive-disclosure and density-ceiling rules for site implementation. It does **not** change mode names, nav hrefs, or core-spine deep links (ADR-UX-001 / handoff out-of-scope). Platform status banner re-style and visual evidence topology remain ADR-UX-007.

## Decision

### 1. Today desk default density ceiling (AC-CF-D001)

On `CommandCenterDeskView` initial render (before any user interaction), the Today desk surface MUST enforce:

| Ceiling | Bound |
|---------|-------|
| Page / mode H1 | ≤1 |
| Filled / primary CTA | ≤1 |
| Action queue rows visible before “View all” | ≤3 |
| Persistent status region (outbox or ops banner) | ≤1 |

Forbidden above the fold before interaction: module-tile grids and analytics / KPI widget grids. Attention chips max 5 initially (remainder behind “Show N more”); activity feed max 5 initially (remainder behind explicit load-more).

### 2. KPI progressive disclosure + smoke anchors (AC-CF-D004, AC-CF-D008)

- KPI tiles render inside a `<details>` **closed by default** for **all** desk personas (`desk_contributor` and `desk_supervisor`).
- Preserve smoke / cohesion anchors: `id='dash-kpis'` and `data-section='kpis'` on the KPI `<details>` (or equivalent element that remains the `#dash-kpis` target).
- At initial render, visible `[data-kpi-tile]` count MUST be **0** for both desk personas (measurement depends on RR-CF-006 instrumentation — see §7).

### 3. Slot order invariant (AC-CF-D007)

`CommandCenterDeskView` (`src/components/dashboard/command-center-desk-view.tsx`) DOM order is binding:

| Slot | Content | Visibility |
|------|---------|------------|
| 1 | Action queue (`DashboardActionQueueHero`) | Always visible |
| 2 | KPIs (`KpiSection` / disclosed `<details>`) | Closed by default |
| 3 | Onboarding checklist | Disclosed / hidden when complete; `data-section="onboarding"` |
| 4 | Programme updates (`DashboardProgramUpdates`) | Below slots 1–3 only |
| 5 | Activity feed (`DashboardActivityFeed`) | Below slot 4; omissible on low-height viewports |

**Invariant string (acceptance language):** slot order = action queue → (disclosed) KPIs → onboarding → program updates → activity.

Slot 1 MUST precede all other panels in DOM. KPIs MUST precede onboarding. Management panels (slots 4–5) MUST follow slots 1–3. ≤1 `.btn-primary` in the action queue strip.

### 4. UR-CF-010 — KPI collapse-state driver

**Decision: `localStorage` preference + breakpoint default** (not breakpoint-only).

| Rule | Behavior |
|------|----------|
| First visit / no stored preference | Closed for all desk personas at every breakpoint |
| Breakpoint default when unset | Prefer collapsed below `lg`; still closed on first paint at `lg+` until the user opens |
| User opens / closes KPI `<details>` | Persist preference in `localStorage` and honor on subsequent loads |
| Explicit reset / cleared storage | Revert to first-visit closed default |

Rationale: master-spec §5.1 already describes preference + breakpoint; breakpoint-only would discard supervisor intent to keep KPIs open across sessions and would force re-disclosure after every navigation. First-paint closed remains mandatory regardless of prior preference until hydration applies stored state — density gates measure **before interaction** with KPIs closed.

### 5. Field launcher forbidden content (AC-CF-D009)

`DashboardFieldLauncher` remains Capture intake + pending outbox only.

**Forbidden imports / content:** `DashboardKpiTile`, `DashboardActivityFeed`, `DashboardProgramUpdates`, `ModuleMaturityBanner` (management-tier), `PortCoPilotProofPanel`.

Field affordances: “Start here” heading always visible; ≤1 `.btn-primary-soft` lead; other intake as `.btn-secondary`; `aria-labelledby` on Quick lists referencing the visible heading.

### 6. Capture / Decide / Prove density ceilings (AC-CF-D002, AC-CF-D006 + handoff)

| Surface | Ceiling |
|---------|---------|
| **Capture** wizard step | Single-column at all breakpoints (390px and 1280px); ≤1 primary CTA per step; AI Suggest always secondary/ghost — never sole or co-primary; no `ModuleMaturityBanner` in wizard step chrome; no two sticky bars |
| **Decide** | ≤1 contextual primary CTA; Approve (or Review) = filled primary; Reject / Request revision = secondary with confirmation; destructive actions never visually equal or above the forward action |
| **Prove** (default) | Status colours for urgency only — no decorative green/teal wash on neutral audit rows; `ModuleMaturityBanner` remains visible (not collapsed/hidden) on Prove secondary / Connected / Plumbing entry surfaces |

**UR-CF-011 / Prove analytics:** Calm Focus MUST NOT place incidence-rate or analytics widgets in the Prove **default** view. Analytics remain on secondary subpaths (ADR-UX-001 Records & metrics). Scope of whether supervisor analytics belong in Prove later is **out of scope / deferred** (UR-CF-011); this ADR only binds the negative: they must not appear in Prove default.

### 7. Interactive control cap ≤12 (AC-CF-D005)

At initial Today render — **1440×900** headless Chromium, after hydration / networkidle, **before any interaction**:

- Total focusable interactive controls **≤12**.
- Measurement selector (acceptance):  
  `a[href]:not([aria-hidden="true"]):not([hidden]), button:not([aria-hidden="true"]):not([hidden]), details > summary:not([aria-hidden="true"]), input:not([hidden]):not([type="hidden"]), select:not([hidden])`
- **Exclude:** `display:none` / `visibility:hidden` (computed), `aria-hidden="true"`, `[hidden]`, and controls inside **closed** `<details>` (including closed KPI section).
- Visible `[data-kpi-tile]` count MUST be **0** under the same conditions for both desk personas.

### 8. Executable encoding contract (AC-CF-D003) — describe only

Implementation packets MUST encode these ceilings as CI-executable tests — **not prose-only**. Preferred path:

`tests/unit/dashboard/density-ceiling.test.ts`

(or a documented extension of `tests/unit/dashboard/cohesion.test.ts` if cohesion already owns the fixture harness).

**Required assertions (contract for a later impl packet; not authored here):**

1. Today: H1 count ≤1; filled/primary CTA ≤1; status region ≤1; queue rows ≤3 before “View all”.
2. Slot order: `DashboardActionQueueHero` precedes `KpiSection` precedes programme updates / activity in DOM.
3. KPI `<details>` closed by default; `id='dash-kpis'` and `data-section='kpis'` present.
4. Capture single-column + ≤1 primary per step; Decide ≤1 contextual primary; AI Suggest never sole/co-primary.
5. Field launcher static import audit against the forbidden list; ≤1 `.btn-primary-soft`.
6. Optional cohesion smoke continues to resolve `#dash-kpis`.

Playwright density evidence (`calm-focus-density.spec.ts`, CDP control count at 1440×900) remains the acceptance evidence path for AC-CF-D004 / AC-CF-D005; unit tests are the component-level CI gate for AC-CF-D003.

### 9. RR-CF-006 — `data-kpi-tile` residual (first-PR impl, not this ADR)

`DashboardKpiTile` root MUST expose `data-kpi-tile` so density gates can count tiles. Attribute **may be absent today**. Binding residual:

- **RR-CF-006** — blocking for AC-CF-D004 / AC-CF-D005; owned by a later Calm Focus **implementation** packet / first PR.
- This authoring packet **does not** add the attribute or change product code.

### 10. Non-goals (binding)

- No IA restructuring; no Today / Capture / Decide / Prove rename or merge.
- No core-spine URL / deep-link changes.
- No parallel dashboard layout tree (ADR-UX-002).
- No product, test, or CI code in this packet.
- Authoring specialist must not self-approve; Status advanced only after `site-adr-adversary` PASS / PASS_WITH_NOTES (recorded 2026-07-19).

## Consequences

- Impl packets that touch Today desk, field launcher, Capture wizards, Decide action regions, or Prove default MUST satisfy AC-CF-D001–D009 and fail CI via `density-ceiling.test.ts` (or cohesion extension) when violated.
- KPI open preference becomes a client persistence concern (UR-CF-010); first-paint density gates stay closed-KPI.
- Prove default stays evidence/audit-first; analytics expansion waits on a future product revision (UR-CF-011).
- RR-CF-006 blocks density Playwright evidence until `data-kpi-tile` lands in an impl PR.
- Adversary review must sign off before Status may advance toward Accepted (AC-CF-R002).

## Acceptance mapping

| Criterion / residual | Where bound in this ADR |
|----------------------|-------------------------|
| AC-CF-D001 | §1 Today density ceiling |
| AC-CF-D002 | §6 Capture wizard |
| AC-CF-D003 | §8 Executable encoding contract |
| AC-CF-D004 | §2 KPI closed default; §7 tile count 0 |
| AC-CF-D005 | §7 ≤12 controls @ 1440×900 |
| AC-CF-D006 | §6 Capture / Decide stress CTA |
| AC-CF-D007 | §3 Slot order invariant |
| AC-CF-D008 | §2 `id='dash-kpis'` + `data-section='kpis'` |
| AC-CF-D009 | §5 `DashboardFieldLauncher` forbidden list |
| AC-CF-R002 | This file + Adversary review PASS_WITH_NOTES (2026-07-19) |
| RR-CF-006 | §9 first-PR residual on `data-kpi-tile` / `DashboardKpiTile` |

## Adversary review

| Field | Value |
|------|----------|
| Disposition | **PASS_WITH_NOTES** |
| Reviewer | `site-adr-adversary` |
| Date | 2026-07-19 |
| Scope checked | Progressive disclosure, density ceilings, control-cap measurement, field forbidden list, UR-CF-010, Prove-default analytics prohibition, RR-CF-006 ownership vs ADR-UX-001/002 |
| Notes / residual risks | (1) UR-CF-010 localStorage restore after hydration must not break AC-CF-D004/D005: density Playwright evidence MUST use storage-cleared / first-visit context; returning-user open preference is allowed after intentional expand, not as the gate baseline. (2) RR-CF-006 remains first-PR blocking residual (G-CF-RR-006), not closed by this ADR. (3) Program line previously said “revision 4” — clarified as master-spec rev 4 / handoff cycle `calm-focus-gen-1`. Evidence: `.corp-harness/evidence/adr-ux-006-adversary-review.txt`. G-CF-ADR-002 clear alongside 005/007. |

## Evidence

| Artifact | Path / note |
|----------|-------------|
| This ADR | `docs/adr/ADR-UX-006-progressive-disclosure-today-home.md` |
| Density unit gate (future) | `tests/unit/dashboard/density-ceiling.test.ts` (or cohesion extension) — not implemented in this packet |
| Density Playwright evidence (future) | `evidence/calm-focus-density-[hash].txt` per acceptance.json |
| Depends | ADR-UX-001, ADR-UX-002 |
| Follow-on | ADR-UX-007 (platform status / a11y / visual evidence); impl packets for ComponentDensity + RR-CF-006 |
