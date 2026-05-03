# Data subject access requests (DSAR) — process stub

This document is **not legal advice**. Align with your **Data Protection Officer / counsel** before operating in production.

## What the product does today

- **Intake tickets:** org-scoped rows for data subject / privacy requests (`/dashboard/privacy-requests`, `compliance.dsar.*`). These support your **privacy register**; they are not an export bundle.
- **Retention policies** can be configured per org (`/dashboard/retention`) with counsel-defined meanings for `minimum_years` and actions (`hold`, `anonymize`, `delete`).
- **Incidents** and **documents** support **`legal_hold`** flags to block automated lifecycle steps (see cron data-retention route).
- **Exports**: OSHA-oriented injury/illness **JSON snapshot** omits ciphertext and many narrative PHI fields; it is **not** a packaged DSAR bundle.

## Recommended operating model (manual + tool-supported)

1. **Intake** — Verified data-subject request logged in your privacy register (outside or inside this app, per policy).
2. **Scope** — Identify organizations/sites and record classes (incidents, training, documents, RAG sources, etc.).
3. **Discovery** — Use admin queries / DB access with RBAC; map to `user` / `membership` / domain tables. Redact third-party data where law requires.
4. **Export** — Assemble a **counsel-approved** package (format varies by jurisdiction). The app’s JSON OSHA snapshot and audit logs may be **inputs**, not the final deliverable.
5. **Delivery** — Secure channel per policy; record delivery in the privacy register.
6. **Erasure / restriction** — If applicable, update records, apply legal holds where litigation requires retention, and document decisions.

## Technical gaps (future automation)

- No single-click “export all PII for email X” (barrier: schema breadth, pseudonymous workers, and lawful basis review).
- **Fully automated erasure** across RAG chunks, attachments, and backups requires **backup/replica** policy beyond this repo.

Track product-facing work on the roadmap in [`ROADMAP.md`](../ROADMAP.md).
