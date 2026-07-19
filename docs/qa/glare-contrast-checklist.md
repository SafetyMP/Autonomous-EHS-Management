# Glare / outdoor contrast checklist (ADR-UX-004 / AC-021 + ADR-UX-005 / AC-CF-A002)

Manual field-readability checks for high-glare (sunlight / reflective) use. Complements axe WCAG 2.2 AA automation — **does not** claim WCAG 3 conformance (AC-008).

## Setup

- Device: local Chromium Playwright Gen-1 routes (return-work 2026-07-19) + token review in `globals.css`
- Surfaces: sign-in, field home (`/dashboard`), incident create, CAPA list, approvals, audit-trail
- Prefer Calm Focus light theme tokens in `src/app/globals.css` (`data-theme="calm"`)
- Axe WCAG 2.2 AA `color-contrast` executed via `--project=a11y` (9/9 passed on prior Gen-1; re-run after Calm Focus token PR)

## Calm Focus tokens (AC-CF-A002)

| Token | Value | Glare / contrast role |
|-------|-------|------------------------|
| `--background` | `#f8fafc` (slate-50) | Page ground |
| `--surface` / `--surface-elevated` | `#ffffff` | Content card (lightest layer) |
| `--surface-muted` | `#f1f5f9` (slate-100) | Section / banner ground |
| `--foreground` | `#0f172a` (slate-900) | Body / form / table copy (≥12:1 on white) |
| `--text-muted` | `#475569` (slate-600) | Captions / meta (≥4.5:1 on white / slate-100) |
| `--primary` | `#0d9488` (teal-600) | Filled CTAs, active accent |
| `--primary-hover` / `--focus` / `--success` | `#0f766e` (teal-700) | Hover, focus rings, task-completion success |
| `--primary-fg` | `#ffffff` | On filled primary — **UI/large text only** (≥14px semibold); forbid 13px captions on teal |
| `--primary-soft` | `#f0fdfa` | Soft primary ground |
| `--primary-on-dark` | `#2dd4bf` (teal-400) | Active stripe / icons on nav rail only |
| `--danger` | `#b91c1c` | Urgency only (unchanged) |
| `--warning` | `#b45309` | Urgency only (unchanged) |
| Nav rail | `#1e293b` / `#0f172a` | Subordinate chrome; non-active text `#94a3b8` |

## Checklist

| # | Check | Pass criteria | Result (Y/N/NA) | Notes |
|---|--------|---------------|-----------------|-------|
| G1 | Body copy vs surface | Text on white/muted surfaces reads without squinting; avoid zinc-500-class alone for instructions | Y | Prefer `--foreground` / `--text-muted` / `.text-glare-muted` |
| G2 | Primary CTA | Filled primary / soft-primary labels remain legible; focus ring visible outdoors | Y | `--primary` / `--focus`; CTA ≥14px semibold (white-on-teal UI path) |
| G3 | Skip link on focus | Skip link appears with strong contrast when Tab-focused | Y | chrome-landmarks + a11y-shell |
| G4 | Error / alert text | `role="alert"` and danger tokens readable on danger-surface | Y | `--danger` / `--danger-surface` |
| G5 | Status / outbox region | Offline sync status text remains readable (when flag on) | Y | outbox status region; status colours urgency-only |
| G6 | Field Start-here actions | Lead “Report incident” (or equivalent) remains distinct from secondary links | Y | `.btn-primary` / `.btn-primary-soft` |
| G7 | Form labels | Title / What happened labels and values contrast ≥ AA intent under glare | Y | `--foreground` on `--surface` |
| G8 | Header brand + Menu | Sticky header text and Menu control remain readable (48–56px bar) | Y | Quiet chrome; no hero gradient |
| G9 | Disabled controls | Disabled Submit (offline without outbox) still distinguishable, not “invisible grey” | Y | token opacity on `.btn-primary:disabled` |
| G10 | Touch target glare | ≥44px targets remain hittable; labels not washed out | Y | `@utility touch-target` / `.btn-*` min 2.75rem (AC-CF-A004) |
| G11 | Nav rail on dark | Active teal-400 stripe/icons readable on slate-800/900; non-active slate-400 subordinate | Pending | Calm Focus chrome; field glare spot-check |

## Token guidance (implementation)

- Prefer `--text-muted` / `.text-glare-muted` over `text-zinc-500` for helper copy on light surfaces
- Keep `--foreground` / `--primary` for critical instructions and CTAs
- Do not use `--primary-fg` on `--primary` for 13px caption text (adversary note / AC-CF-A002)
- Status colours (`--danger`, `--warning`, `--success`) are urgency / completion only — not decorative washes
- Do not introduce dark-mode-only reliance for Gen-1 field paths

## Sign-off

| Field | Value |
|-------|-------|
| Tester | site return-work (root orchestrator) + PKT-CF-005-IMPL checklist update |
| Date | 2026-07-19 |
| Environment | local seeded + Calm Focus tokens in worktree `calm-focus-005-impl` |
| Outstanding glare debts | True outdoor sunlight / notch-device visual spot-check not performed; axe AA color-contrast re-run after token land remains recommended |

**Digest:** `.corp-harness/evidence/return-a11y.txt` sha256 `c6b8592feb9c0b3ebbe8f5c4690aceb18936f48f12075c26d0a010f731da00c4`

Evidence index row: AC-021 in [ux-acceptance-evidence-index.md](./ux-acceptance-evidence-index.md).
