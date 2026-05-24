# Case study publication workflow

All files under `docs/case-studies/portco-*.md` are **synthetic / illustrative** until this workflow completes. Do not use metrics externally without marketing and customer approval.

## Before external publication

1. **Customer sign-off** — written approval for anonymized name, scope, and quoted metrics.
2. **Evidence pack** — redacted screenshots and exports in `docs/case-studies/assets/<pilot-slug>/` (see [assets/README.md](./assets/README.md)).
3. **Replace placeholders** — update the case study markdown: baseline/after tables, live date, modules list, and remove the synthetic disclaimer block.
4. **Legal review** — confirm no PII, trade secrets, or unapproved competitive claims.
5. **Procurement alignment** — ensure claims match [procurement-integrations-appendix.md](../procurement-integrations-appendix.md) and [module-maturity.md](../module-maturity.md).

## Asset naming convention

```
docs/case-studies/assets/<pilot-slug>/
  integrations-event-log-redacted.png
  roster-drift-widget-redacted.png
  capa-cycle-export-redacted.pdf
  README.md   # optional: caption + capture date
```

`<pilot-slug>` examples: `portco-beta-industrial-2026`, `portco-gamma-contractor-2026`.

## Which narrative for which buyer question

| Case study | Best for |
|------------|----------|
| [portco-alpha-manufacturing.md](./portco-alpha-manufacturing.md) | Incident/CAPA cycle time, audit prep |
| [portco-beta-industrial-services.md](./portco-beta-industrial-services.md) | HRIS iPaaS + SCIM staging |
| [portco-gamma-contractor-wedge.md](./portco-gamma-contractor-wedge.md) | Contractor credentials + renewal queue |

## Until real data exists

Keep synthetic disclaimers in place. Use [pilot-template.md](./pilot-template.md) for new drafts. Staging verification for integration claims: [../qa/portco-staging-pilot.md](../qa/portco-staging-pilot.md).
