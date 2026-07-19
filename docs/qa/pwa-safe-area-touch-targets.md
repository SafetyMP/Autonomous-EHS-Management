# PWA safe-area and ≥44px touch targets (ADR-UX-003 / AC-017 / AC-009)

## Contract

| Surface | Requirement |
|---------|-------------|
| Root viewport | `viewportFit: cover` in `src/app/layout.tsx` (do not regress) |
| Site header | `pt-[max(...,env(safe-area-inset-top))]` + horizontal safe-area padding |
| Outbox / install chrome | `.field-status-region` uses `env(safe-area-inset-left/right)` |
| Success toast (optional) | Bottom stack clears `safe-area-inset-bottom`; does not cover Retry |
| Touch targets | Field launcher primary, incident create Submit, outbox Retry/Remove ≥44×44 CSS px (`.touch-target` / `.btn-primary`) |
| Language | Installable progressive web / home-screen shortcut only — **not** App Store / native (D-006 blocked) |

## Checklist

| # | Check | Result |
|---|-------|--------|
| 1 | Computed `padding-top` on sticky `header` is a CSS length (includes safe-area max expression) | **PASS** — `@smoke header uses safe-area inset padding` |
| 2 | `#field-outbox-status` Retry / Remove boundingBox ≥44×44 (flag=1 + failed seed) | **PASS** — return-outbox-touch digest `941da3e5…` |
| 3 | Field **Report incident** (when visible) ≥44×44 | **PASS** (when launcher visible) |
| 4 | `/dashboard/incidents/new` Submit ≥44×44 | **PASS** |
| 5 | `PwaInstallHint` copy says installable web / not native store | **PASS** (source + claim-lint) |
| 6 | Safari missing `beforeinstallprompt` is expected, not a defect | **NA** (documented) |

**Automated pair:** `tests/e2e/smoke/offline-dashboard-banner.spec.ts` tags `@touch` / `@smoke`.  
**Digest:** `.corp-harness/evidence/return-outbox-touch.txt` sha256 `941da3e53b3c739b5e04111c779080f085512c94637df5c7666c826038a60ae9`.

**Honesty:** Desktop Chromium resolves safe-area insets to `0px`; length + touch sizes asserted. Notch-device visual spot-check remains a residual staging nicety, not a Gen-1 gate invent.
