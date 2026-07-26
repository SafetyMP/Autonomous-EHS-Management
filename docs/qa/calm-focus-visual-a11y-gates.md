# Calm Focus visual + WCAG 3 claim gates (ADR-UX-007)

## Visual scaffold (AC-CF-S003 / AC-CF-V010)

| Item | Path / command |
|------|----------------|
| Specs | `tests/e2e/visual/**/*.spec.ts` (`@visual`, not `@smoke`) |
| Manifest | `evidence/calm-focus-visual-manifest.json` |
| Run contract | `npx playwright test tests/e2e/visual` |
| Capture screenshots | `PLAYWRIGHT_VISUAL=1 npx playwright test --project=visual` (auth + seed required for persona surfaces) |
| Playwright project | `visual` in `playwright.config.ts` (ignored by default chromium project) |

Real PNG digests replace placeholders when capture succeeds (`digest_kind: "png"`). `npm run db:seed:ci` creates both `e2e.admin@ci.local` (desk_supervisor) and `e2e.contributor@ci.local` (desk_contributor) so all four canonical surfaces can capture. Human review of S1–S4 (metric grid / field CTAs) remains a promotion step — not self-attested by CI alone. Brand checklist: [calm-focus-brand-test-checklist.md](./calm-focus-brand-test-checklist.md).

Evidence: `evidence/calm-focus-visual-manifest.json`, `evidence/visual/*.png`; harness logs under `.corp-harness/evidence/calm-focus-visual-*.txt`.

## WCAG 3 claim lint (RR-CF-001 / AC-CF-A003)

```bash
./scripts/check-wcag3-claims.sh
# equivalent:
node scripts/claim-lint.mjs --wcag3
```

Forbidden claim verbs (non-exhaustive display names): WCAG 3 conformant / certified / compliant; meets WCAG 3; compliant with WCAG 3; WCAG 3.0 variants.

Disclaimer carve-out: files that include *WCAG 3 conformance is not claimed; this is design intent only.* are treated as design-intent docs (matches still require negative/forbidden context on the line, or ignore fences).

## A11y re-run (AC-CF-A001)

```bash
npm run test:e2e:a11y
# or: npx playwright test --project=a11y
```

Requires Playwright browsers + (for signed-in specs) `PLAYWRIGHT_E2E_*` with `CI=true` or `PLAYWRIGHT_E2E_FORCE=1` against a migrated/seeded DB. Do not claim axe PASS without running this suite.

Evidence digest (return-work): `.corp-harness/evidence/calm-focus-a11y-r1.txt`.

Calm Focus token-changed routes covered: desk Today (`desk-today.a11y.spec.ts`), field home, incident create, Decide (approvals), Prove (CAPA / audit trail), plus chrome landmarks / sign-in.

## Touch (AC-CF-A004)

```bash
npx playwright test tests/e2e/smoke/calm-focus-touch.spec.ts
```

BoundingBox ≥44×44 for field primary CTAs, incident submit, and outbox Retry/Remove when `NEXT_PUBLIC_FIELD_OUTBOX=1`. Also asserts `#field-outbox-status` is not `display:none` / `visibility:hidden` and header `viewport-fit=cover` / safe-area padding remain.

Evidence digest: `.corp-harness/evidence/calm-focus-touch-r1.txt`.

## Motion / outbox / safe-area

- Motion budget remains MO-1..MO-3; new transitions need `prefers-reduced-motion` guards.
- `#field-outbox-status` and `env(safe-area-inset-*)` must stay intact (AC-CF-A005 / A006).
