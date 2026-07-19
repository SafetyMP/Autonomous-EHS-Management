# Glare / outdoor contrast checklist (ADR-UX-004 / AC-021)

Manual field-readability checks for high-glare (sunlight / reflective) use. Complements axe WCAG 2.2 AA automation — **does not** claim WCAG 3 conformance (AC-008).

## Setup

- Device: local Chromium Playwright Gen-1 routes (return-work 2026-07-19) + token review in `globals.css`
- Surfaces: sign-in, field home (`/dashboard`), incident create, CAPA list, approvals, audit-trail
- Prefer light theme tokens in `src/app/globals.css` (`--foreground`, `--text-muted`, `--primary`)
- Axe WCAG 2.2 AA `color-contrast` executed via `--project=a11y` (9/9 passed)

## Checklist

| # | Check | Pass criteria | Result (Y/N/NA) | Notes |
|---|--------|---------------|-----------------|-------|
| G1 | Body copy vs surface | Text on white/muted surfaces reads without squinting; avoid zinc-500-class alone for instructions | Y | axe color-contrast Gen-1; `--text-muted` / glare-muted tokens |
| G2 | Primary CTA | Filled primary / soft-primary labels remain legible; focus ring visible outdoors | Y | axe on incident create / field home; focus tokens |
| G3 | Skip link on focus | Skip link appears with strong contrast when Tab-focused | Y | chrome-landmarks + a11y-shell |
| G4 | Error / alert text | `role="alert"` and danger tokens readable on danger-surface | Y | axe Gen-1; form error patterns |
| G5 | Status / outbox region | Offline sync status text remains readable (when flag on) | Y | outbox status region exercised flag=1 |
| G6 | Field Start-here actions | Lead “Report incident” (or equivalent) remains distinct from secondary links | Y | field launcher + keyboard path |
| G7 | Form labels | Title / What happened labels and values contrast ≥ AA intent under glare | Y | axe incident-create |
| G8 | Header brand + Menu | Sticky header text and Menu control remain readable | Y | axe field-home / chrome |
| G9 | Disabled controls | Disabled Submit (offline without outbox) still distinguishable, not “invisible grey” | Y | token opacity on `.btn-primary:disabled` |
| G10 | Touch target glare | ≥44px targets remain hittable; labels not washed out | Y | `@touch` smoke ≥44px |

## Token guidance (implementation)

- Prefer `--text-muted` / `.text-glare-muted` over `text-zinc-500` for helper copy on light surfaces
- Keep `--foreground` / `--primary` for critical instructions and CTAs
- Do not introduce dark-mode-only reliance for Gen-1 field paths

## Sign-off

| Field | Value |
|-------|-------|
| Tester | site return-work (root orchestrator) |
| Date | 2026-07-19 |
| Environment | local seeded (`ehs-ux-return-pg` :5434) + Playwright a11y |
| Outstanding glare debts | True outdoor sunlight / notch-device visual spot-check not performed; axe AA color-contrast is the executable Gen-1 bar |

**Digest:** `.corp-harness/evidence/return-a11y.txt` sha256 `c6b8592feb9c0b3ebbe8f5c4690aceb18936f48f12075c26d0a010f731da00c4`

Evidence index row: AC-021 in [ux-acceptance-evidence-index.md](./ux-acceptance-evidence-index.md).
