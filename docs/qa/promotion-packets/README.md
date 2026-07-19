# Promotion packet — QA banner spot-check

ADR-S-001 requires Plumbing / Gated dashboard surfaces to retain a **maturity
banner** in the UI until (a) their tier is legitimately elevated with the six
promotion-packet artifacts, and (b) any regulated Plumbing → Core jump has a
counsel exception ID recorded per
[`docs/lifecycle/promotion-packet.md`](../../lifecycle/promotion-packet.md) §5.

Because the site-specialist scope for ADR-S-001 excludes `src/**`, this note
records the **manual spot-check procedure** used by QA and site reviewers.
The executable UI assertion (Playwright `@smoke` case that verifies the
banner) lands in a future ADR that owns the affected routes.

## Surfaces that must show a maturity banner

Cross-reference:
[`docs/module-maturity.md`](../../module-maturity.md) per-module tier map
rows where "Banner in UI?" is `Yes` or `Yes (optional)`. As of ADR-S-001 the
list is:

| Route | Reason banner is expected |
|-------|----------------------------|
| `/dashboard/chemicals` | Plumbing chemicals inventory — HCS 2024 / EPCRA 2027 hazard fields for programme management. Not EPA / Tier II submission. |
| `/dashboard/privacy-requests` | Plumbing DSAR intake / policy surfaces only — not automated erasure. |
| `/dashboard/import` | Plumbing bulk-import scaffolds. |
| `/dashboard/heat-program` | Connected Heat NEP Appendix I aid — not a heat-standard compliance determination. |
| `/dashboard/risk-assessments` | Connected register + steps — not bowtie / LOPA replacement. |
| `/dashboard/environmental-permits` (optional) | Register scope banner where relevant to the buyer context. |

Update this table whenever a row in `docs/module-maturity.md` changes the
"Banner in UI?" column.

## Spot-check procedure

1. Start the app locally against demo data (`npm run demo:up`, then
   `npm run dev`) or against a signed-in staging tenant.
2. For each row above, load the route in the browser and confirm that the
   maturity banner element is visible **above the fold** and legible under
   both light and high-glare / dark-mode themes (see
   [`ui-ux-field-accessibility`](../../../.cursor/skills/ui-ux-field-accessibility/SKILL.md)).
3. Confirm the banner text names the specific limitation (e.g. "Not an EPA
   submission" for chemicals, "Not automated erasure" for privacy requests).
4. Record the check in the promotion packet PR body using this format:
   ```
   ## Banner spot-check (ADR-S-001)
   - /dashboard/chemicals: OK — banner text "Programme inventory only …" (screenshot: <link>)
   - /dashboard/privacy-requests: OK — banner text "DSAR intake only …" (screenshot: <link>)
   ```
5. Any missing or misleading banner is a **blocker** for promotion; open a
   separate ticket to restore the banner before merging.

## Non-goals in this note

- No executable UI test lands here (out of ADR-S-001 write scope).
- No product-code change to add or move banners (out of scope; src/**
  excluded from the ADR-S-001 write set).
- No self-marking of the `site_verify` or `operations` gate — the root
  orchestrator runs those commands and operations excellence reviews the
  evidence.
