# Regulatory and privacy posture (engineering)

This document aligns product capability with compliance claims. **It is not legal advice.** Final retention periods, lawful basis for processing, and reporting obligations require qualified counsel and jurisdiction-specific review.

## Product positioning

| Capability | Status |
|------------|--------|
| **ISO 45001 / 14001-style** incident and management workflows | Intended product scope. EMS surfaces support **ISO 14001:2026 transition programme aids** (context environmental conditions, aspect climate/biodiversity relevance, MOC Clause 6.3 planning fields). **Not claimed** as a certification body or IAF transition completion. |
| **OSHA Forms 300 / 301 / 300A as authoritative record of injury/illness** | **Not claimed.** The app adds optional **OSHA-oriented sidecar fields** (`work_related_injury_illness_record`, `establishment`) to support structured exports and internal workflows. Customers remain responsible for official OSHA recordkeeping accuracy and submissions. |
| **OSHA Heat NEP / heat illness prevention as regulatory determination** | **Not claimed.** Optional **Heat NEP program aid** (Appendix I–aligned self-audit checklist, optional heat-condition logs) supports inspection readiness. **Not** a substitute for a final federal heat standard or Cal/OSHA §§3395/3396 compliance determination. |
| **EPA EPCRA Tier II / chemical inventory reporting as system of record** | **Not claimed.** Schema supports **Tier II–oriented** chemical and inventory snapshots plus **HCS 2024 / EPCRA 2027 hazard class+category** fields for programme management. Submissions to agencies (including Tier2 Submit) are the customer’s responsibility. |
| **Safety observations & permits to work (PTW)** | **Operational / program records** (leading indicators and hazardous-work authorization for hot work, confined space, etc.). **Not claimed** as OSHA injury/illness logs. **Not** the same as **environmental regulatory permits** (air/water/waste); PTW is a distinct `work_permit` module. |
| **Environmental regulatory permit register** | **Internal program register** in-app (`environmental_regulatory_permit`): metadata, conditions, linkage to monitoring and obligations. **Not claimed** as an agency system of record or filing-ready submission unless counsel and customer define that outside the app. |
| **Risk assessments / JSAs** | **Program records** (`risk_assessment`, optional `risk_assessment_step` for task-based JSAs). **Not claimed** as a substitute for legally mandated risk studies where jurisdiction requires specific formats or approvals. |
| **GDPR / global privacy** | Technical measures include retention dates, legal hold flags, anonymization jobs, RBAC-separated incident narrative access, and RAG ingest redaction. **Lawful basis, DPIA, and cross-border transfers are organizational decisions**, not enforced by this software alone. |

## Encryption at rest

- **Database:** Encryption at rest is provided by the **PostgreSQL host** (e.g. Neon, Vercel-managed, or self-hosted with disk/TDE). This repository does not configure database TDE.
- **Application layer:** Sensitive supplementary fields may store **opaque ciphertext** in `work_related_injury_illness_record.supplementary_details_ciphertext` when integrated with a customer KMS; plaintext medical or HR data should be minimized.

## Operational controls

- **Retention / anonymization:** `/api/cron/data-retention` (Vercel Cron + `CRON_SECRET`) processes **`incidents`**, **`safety_observation`**, and **`work_permit`** rows whose `retain_until <= now`, with `legal_hold = false`, and `anonymized_at IS NULL`. Incident delete vs anonymize follows **`incident_general`** policy action; program rows use **`safety_observation_program`** / **`work_permit_program`** (see Data retention page). Rows **without** a `retain_until` timestamp are skipped until policy-driven defaults populate on create or a user with **`retention:policy_write`** sets overrides. Export and counsel-approved archives before tenant teardown when records must be preserved beyond automated handling.
- **Observations & PTW — PII and RBAC:** Free-text fields (e.g. observation `details`; PTW `work_summary`, `hazards_controls`, `cancel_reason`) may include **worker names or other PII**. Access is gated by **`safety_observation:*`** and **`work_permit:*`**. **`environmental_regulatory_permit`** and **`risk_assessment`** / steps use **`environmental_permit:*`** and **`risk_assessment:*`** respectively; free-text may include site or operational detail—treat as program-sensitive where needed.
- **Default `retain_until` on incident create:** If the org has `data_retention_policy` rows with `record_class = incident_general`, new incidents get the **latest** `retain_until` across those rows: each row uses `minimum_years` with a per-policy **`retention_date_anchor`** — `rolling_from_event` (reference date + N years UTC) or `calendar_year_end` (end of calendar year of reference year + N). Clients may still pass an explicit `retain_until`.
- **Default `retain_until` on observation / permit create:** The same aggregation applies when **`safety_observation_program`** / **`work_permit_program`** policy rows exist, anchoring off **`observed_at`** / **`valid_from`** respectively. Mutations guarded by **`retention:policy_write`** can assign `legal_hold`, clear or change `retain_until` (`observation.update`, `permit.setProgramRetention`), subject to **`audit_log`** for those edits.
- **RAG minimization backfill:** `rag.redactExistingSource` (permission `rag:ingest`) applies current `redactForRagIngest` to an existing source’s `raw_text` and chunks; changed chunks clear embeddings so `backfillEmbeddings` can refresh vectors.
- **Context Sync provenance (`context_sync_provenance`):** Inserts record protocol **read**/**write** accesses (tooling-facing `ctx://` artifacts) **only when** **`organization.context_sync_enabled`** is **true** (otherwise REST returns **`403`** before reads/writes). Row growth is proportional to reads; there is **no bundled purge migration** yet—operators should capacity-plan PostgreSQL usage and optionally define tenant policy (see [`docs/runbooks/context-sync-provenance.md`](docs/runbooks/context-sync-provenance.md)).
- **Contractor / visitor evidence:** `external_party_credential` stores **metadata and links** (policy IDs, validity dates, evidence URI stubs). Treat attachments as **regulated or PII-bearing** where applicable; align storage, retention, and access with counsel. File encryption and DLP are **organizational** controls on top of RBAC and `audit_log` on create/update. **Expiry:** scheduled cron may set credentials with past `valid_to` to `expired` and writes one summarized `audit_log` per affected organization per run (see `credentialExpiry` service).
- **Org deletion:** `incident`, **`safety_observation`**, and **`work_permit`** rows **cascade** on `organization` delete. Organizations that must retain OSHA-style records or field program evidence should use export, **legal hold**, and counsel-approved off-platform archives before tenant teardown.

## Residual risks / operator expectations

- **Uneven `audit_log` coverage:** Many regulated mutations call `writeAuditLog`, but coverage is **not guaranteed to be uniform** across every route or future feature. Treat the audit trail as **high-signal where instrumented**; for procurement or ISO evidence, **spot-check** critical workflows (or extend instrumentation) rather than assuming every state change is captured. See [`docs/workflow-depth.md`](docs/workflow-depth.md) (audit patterns and where to search the codebase).
- **Incident “stripped” projection vs roles:** Users with **`incident:read`** but not **`incident:read_sensitive`** receive **metadata-only** incident records from list/detail APIs (narrative, investigation fields, and related sensitive columns are **omitted**). Product, HR, and counsel should **coordinate** role design, training, and job expectations so supervisors and investigators are not surprised by partial views in the UI ([`src/server/trpc/routers/incident.ts`](src/server/trpc/routers/incident.ts)).
- **Attachment and blob storage:** In-app rows may reference **URIs, uploads, or integration-linked evidence** (e.g. contractor credentials, RAG sources, field photos). **Encryption at rest, backup, DLP, cross-border copies, and subprocessors** for those blobs are **customer/operator responsibilities** unless contractually scoped otherwise—the application enforces **RBAC** and **audit logging** on metadata changes, not the object store’s tenancy or retention.

## Counsel checklist (before changing marketing or DPAs)

1. Confirm target jurisdictions (U.S. federal/state, EU/UK, etc.).
2. Map each personal data category to lawful basis and retention.
3. Align subcontractor list and encryption attestations with the actual database provider.
4. Review whether “OSHA-ready” or “Tier II-ready” language is acceptable or misleading for your buyer contracts.
5. Complete [regulatory-posture-boundary.md](docs/regulatory-posture-boundary.md) for PortCo pilots (program-of-record vs agency-of-record).
