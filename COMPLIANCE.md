# Regulatory and privacy posture (engineering)

This document aligns product capability with compliance claims. **It is not legal advice.** Final retention periods, lawful basis for processing, and reporting obligations require qualified counsel and jurisdiction-specific review.

## Product positioning

| Capability | Status |
|------------|--------|
| **ISO 45001 / 14001-style** incident and management workflows | Intended product scope |
| **OSHA Forms 300 / 301 / 300A as authoritative record of injury/illness** | **Not claimed.** The app adds optional **OSHA-oriented sidecar fields** (`work_related_injury_illness_record`, `establishment`) to support structured exports and internal workflows. Customers remain responsible for official OSHA recordkeeping accuracy and submissions. |
| **EPA EPCRA Tier II / chemical inventory reporting as system of record** | **Not claimed.** Schema supports **Tier II–oriented** chemical and inventory snapshots for program management. Submissions to agencies are the customer’s responsibility. |
| **GDPR / global privacy** | Technical measures include retention dates, legal hold flags, anonymization jobs, RBAC-separated incident narrative access, and RAG ingest redaction. **Lawful basis, DPIA, and cross-border transfers are organizational decisions**, not enforced by this software alone. |

## Encryption at rest

- **Database:** Encryption at rest is provided by the **PostgreSQL host** (e.g. Neon, Vercel-managed, or self-hosted with disk/TDE). This repository does not configure database TDE.
- **Application layer:** Sensitive supplementary fields may store **opaque ciphertext** in `work_related_injury_illness_record.supplementary_details_ciphertext` when integrated with a customer KMS; plaintext medical or HR data should be minimized.

## Operational controls

- **Retention / anonymization:** `/api/cron/data-retention` (Vercel Cron + `CRON_SECRET`) processes incidents with `retain_until <= now`, `legal_hold = false`, and `anonymized_at IS NULL`.
- **Default `retain_until` on create:** If the org has `data_retention_policy` rows with `record_class = incident_general`, new incidents get the **latest** `retain_until` across those rows: each row uses `minimum_years` with a per-policy **`retention_date_anchor`** — `rolling_from_event` (reference date + N years UTC) or `calendar_year_end` (end of calendar year of reference year + N). Clients may still pass an explicit `retain_until`.
- **RAG minimization backfill:** `rag.redactExistingSource` (permission `rag:ingest`) applies current `redactForRagIngest` to an existing source’s `raw_text` and chunks; changed chunks clear embeddings so `backfillEmbeddings` can refresh vectors.
- **Audit:** Lifecycle actions write to `audit_log` and to `data_lifecycle_run` for job-level evidence.
- **Org deletion:** `incident` rows still **cascade** on `organization` delete. Organizations that must retain OSHA-style records should use export, **legal hold**, and counsel-approved off-platform archives before tenant teardown.

## Counsel checklist (before changing marketing or DPAs)

1. Confirm target jurisdictions (U.S. federal/state, EU/UK, etc.).
2. Map each personal data category to lawful basis and retention.
3. Align subcontractor list and encryption attestations with the actual database provider.
4. Review whether “OSHA-ready” or “Tier II-ready” language is acceptable or misleading for your buyer contracts.
