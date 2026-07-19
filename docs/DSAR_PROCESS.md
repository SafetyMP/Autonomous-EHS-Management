# Data subject access requests (DSAR) — intake + counsel process

> **Contract banner (R-012):** This product provides a **privacy-request intake / register** only. It does **not** automate subject access export packages, identity verification, lawful-basis review, or erasure across Postgres, RAG, attachments, backups, or replicas. Operating model = **manual + counsel-directed**. Automation is out of Tier-1 pilot success criteria and remains blocked under barrier **D-002**.

This document is **not legal advice**. Align with your **Data Protection Officer / counsel** before operating in production.

## What the product does today

- **Intake tickets:** org-scoped rows for data subject / privacy requests (`/dashboard/privacy-requests`, `compliance.dsar.*`). These support your **privacy register**; they are not an export bundle.
- **Retention policies** can be configured per org (`/dashboard/retention`) with counsel-defined meanings for `minimum_years` and actions (`hold`, `anonymize`, `delete`). See [`docs/qa/retention-class-inventory.md`](qa/retention-class-inventory.md).
- **Incidents** and **documents** support **`legal_hold`** flags to block automated lifecycle steps (see cron data-retention route).
- **Exports**: OSHA-oriented injury/illness **JSON snapshot** omits ciphertext and many narrative PHI fields; it is **not** a packaged DSAR bundle and must not be marketed as one.

## What the product does **not** claim

- No single-click “export all PII for subject X.”
- No fully automated erasure across RAG chunks, evidence blobs, backups, or subprocessors.
- No “GDPR-compliant automated erasure” or certification-body posture from this intake UI alone.

## Recommended operating model (manual + tool-supported)

1. **Intake** — Verified data-subject request logged in your privacy register (outside or inside this app, per policy).
2. **Scope** — Identify organizations/sites and record classes (incidents, training, documents, RAG sources, etc.).
3. **Discovery** — Use admin queries / DB access with RBAC; map to `user` / `membership` / domain tables. Redact third-party data where law requires.
4. **Export** — Assemble a **counsel-approved** package (format varies by jurisdiction). The app’s JSON OSHA snapshot and audit logs may be **inputs**, not the final deliverable.
5. **Delivery** — Secure channel per policy; record delivery in the privacy register.
6. **Erasure / restriction** — If applicable, update records, apply legal holds where litigation requires retention, and document decisions under counsel direction.

## Technical gaps (future automation)

- Schema breadth, pseudonymous workers, and lawful basis review block safe one-click export.
- **Fully automated erasure** across RAG chunks, attachments, and backups requires **backup/replica** policy beyond this repo.

Track product-facing work on the roadmap in [`ROADMAP.md`](../ROADMAP.md). Claim expansion requires D-002 `unblocked` with a counsel artifact ID.
