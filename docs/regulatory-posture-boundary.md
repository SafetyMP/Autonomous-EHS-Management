# Regulatory posture boundary (program vs agency)

Counsel and procurement worksheet: what Autonomous EHS **is** and **is not** as a system of record for PortCo diligence. **Not legal advice.** Customer contracts and marketing must align with rows marked **Not claimed**.

**Authoritative engineering source:** [COMPLIANCE.md](../COMPLIANCE.md). **RFP gap register:** [procurement-readiness.md](./procurement-readiness.md) §12.

---

## Two postures (define with counsel before pilot)

| Posture | Definition | Autonomous EHS default |
|---------|------------|------------------------|
| **Program-of-record** | Single auditable IMS for ISO-style workflows, internal investigations, CAPA, training proof, contractor credentials, and **management** of compliance obligations | **Intended scope** for Tier 1 pilot |
| **Agency-of-record** | Legally authoritative submission to OSHA, EPA, state environmental agencies, or filing-ready exports accepted by regulators without rework | **Not claimed** unless customer + counsel define external process |

Pilot success criteria should use **program-of-record** language. Do not contract for **agency-of-record** without separate legal and product work.

---

## Module boundary matrix

| Module / data | Program-of-record | Agency-of-record | Buyer statement |
|---------------|-------------------|------------------|-----------------|
| **Incidents & investigations** | Yes — workflow, RBAC, audit trail | No — not OSHA 300/301/301A official log | Internal incident programme; parallel OSHA logs may remain in legacy |
| **OSHA sidecar** (`establishment`, `work_related_injury_illness_record`) | Yes — structured fields for internal export | **No** — not authoritative injury/illness record | `agencyExportPlaceholder` only; no e-filing |
| **CAPA / approvals** | Yes | N/A | Human sign-off; not auto-regulatory classification |
| **Observations / inspections / PTW** | Yes — operational programme | No — not OSHA injury logs | Leading indicators and hazardous-work authorization |
| **Environmental regulatory permits** | Yes — register (metadata, conditions, renewals) | **No** — not agency filing | Distinct from PTW (`work_permit`) |
| **Risk assessments / JSA** | Yes — governed register + steps | No — not bowtie/LOPA / mandated study format | Pilot validation vs Velocity/Intelex depth |
| **Tier II / chemical inventory** | Schema + compliance router; Plumbing UI with hazard categories | **No** — not EPA submission / Tier2 Submit | Customer submits to agencies; HCS 2024–aligned classes are programme fields only |
| **Heat NEP program aid** | Yes — Appendix I checklist + optional condition logs | **No** — not a federal heat standard determination | Inspection-readiness programme aid; Cal/OSHA heat rules remain customer/counsel scope |
| **ISO 14001:2026 EMS transition aids** | Yes — context tags, aspect flags, MOC 6.3 fields | N/A — not a certification body | Programme evidence for transition; CB audits stay external |
| **Training records** | Yes — proof of completion (incl. LMS ingest) | N/A | Not a full LMS |
| **Contractor credentials** | Yes — metadata, expiry, renewal queue | N/A | Not VMS / site access control |
| **DSAR / privacy** | Intake + policy surfaces | **No** — not automated erasure/export | [DSAR_PROCESS.md](./DSAR_PROCESS.md) |
| **Audit trail (`audit_log`)** | High-signal transactional log | N/A — not ISO internal audit programme | Spot-check; partial coverage ([mutation-auditability-matrix.md](./qa/mutation-auditability-matrix.md)) |
| **Internal audit programme** | ISO audit entities in-app | N/A | Separate from transactional audit trail |

---

## Counsel workshop agenda (before production)

1. **Jurisdiction map** — U.S. federal/state, EU/UK, etc. ([COMPLIANCE.md](../COMPLIANCE.md) checklist).
2. **OSHA recordkeeping** — Will official 300/301/300A remain in legacy? If yes, document dual-record procedure and forbid marketing “OSHA system of record.”
3. **Environmental permits** — Which permits are tracked for **renewal management** only vs **agency submission**? Submission stays outside app unless separately scoped.
4. **Tier II / EPCRA** — Program inventory vs filing; who signs submissions.
5. **Contractor vs employee** — HRIS classification, termination, cross-border worker data ([hris-portco-integration-playbook.md](./roadmap/hris-portco-integration-playbook.md) counsel notes).
6. **Retention & legal hold** — Align `data_retention_policy` with counsel timelines; export before tenant delete.
7. **Marketing & contract language** — Ban “filing-ready,” “OSHA-compliant out of the box,” “Tier II submission system” unless counsel approves.

---

## Acceptable vs prohibited contract phrases

| Acceptable (with pilot scope) | Prohibited without additional work |
|------------------------------|-----------------------------------|
| “ISO 45001/14001-style incident and CAPA workflows” | “Replaces OSHA 300 log” |
| “Program register for environmental permit renewals” | “Agency-ready environmental permit filing” |
| “OSHA-oriented sidecar for internal analytics” | “OSHA electronic submission” |
| “Tier II–oriented chemical inventory for programme management” | “EPA Tier II system of record” |
| “HCS 2024–aligned hazard classes for programme inventory” | “Tier2 Submit / EPA e-filing system” |
| “Heat NEP self-audit checklist (program aid)” | “Meets OSHA heat standard” / “Cal/OSHA heat compliant out of the box” |
| “ISO 14001:2026-style EMS transition programme aids” | “ISO 14001:2026 certified by this software” |
| “Governance-aligned DSAR intake” | “GDPR-compliant automated erasure” |

---

## Sign-off (counsel / compliance)

- **Organization:** __________________  
- **Counsel reviewer:** __________________  
- **Date:** __________________  
- **Agreed posture:** Program-of-record only / Other (specify): __________________  
- **Dual-record procedures documented (OSHA/other):** Yes / No / N/A  
- **Notes:** __________________  

Link completed sign-off to [portco-uat-signoff-record.md](./qa/portco-uat-signoff-record.md) production-ready criteria.
