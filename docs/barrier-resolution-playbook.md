# Barrier resolution playbook

This document complements the **Barriers** table in [`ROADMAP.md`](../ROADMAP.md): it proposes **ownership**, **preconditions**, and **phases** to move each item from scaffold to controlled production posture. Nothing here is legal advice; engage counsel where noted.

**Authority:** Corporate R-014 + [ADR-S-002](./adr/ADR-S-002-ranked-portfolio-barriers.md). Unresolved decisions block **claim expansion** only — they do not fail DESIGN packaging of the honest maturity map.

---

## Decision register (D-001..D-012)

IDs match corporate master-spec R-014. **D-004, D-008, D-009, D-010, D-011, D-012** are stable for ADR-S-005 (ops / evidence / deploy-class work). Status values: `blocked` | `unblocked`. Unblocking claim expansion requires a counsel/ops artifact ID in the Notes column (or equivalent recorded exception).

| ID | Decision | Owner | Status | Blocks (claim expansion) | Notes / narrative |
|----|----------|-------|--------|--------------------------|-------------------|
| **D-001** | Tenant funding + validated layouts for OSHA agency export beyond placeholder | Compliance / Counsel + Program | blocked | Filing / “agency SoR” claims | See [Agency-formatted OSHA filing export](#agency-formatted-osha-filing-export) |
| **D-002** | DSAR export/erasure ownership and jurisdictions | Compliance / Counsel | blocked | Full DSAR automation claims | See [Full DSAR automation](#full-dsar-automation-beyond-intake) |
| **D-003** | OIDC JIT default org/role policy for production | Security / IAM + HR | blocked | Identity go-live claims beyond scaffold | See [OIDC JIT org provisioning](#oidc-jit-org-provisioning) |
| **D-004** | pg-boss vs HTTP cron as default production job model | Platform lead / SRE | blocked | Autonomous-ops completeness claims | See [Durable job queue](#durable-job-queue-eg-pg-boss); ranked **P5** |
| **D-005** | Chemicals path to Core vs permanent Plumbing + partner Tier2 Submit | Compliance / Counsel + Product | blocked | Chemicals Core / Tier2 Submit claims | Partner Tier2 Submit remains out of Core until counsel exception |
| **D-006** | Native mobile vs progressive web field UX | Product + staff-eng-product | blocked | Native mobile inspection / field-app claims | Pilot stays responsive web ([portco-tier1-pilot-scope.md](./qa/portco-tier1-pilot-scope.md)) |
| **D-007** | Commercial support SLA separate from Apache 2.0 license | Commercial / Maintainers | blocked | Paid support-SLA sales claims | Open-source license ≠ enterprise support contract |
| **D-008** | Production monitoring owner (Prometheus-operator vs vendor APM) + cron scrape parity | SRE / Platform | blocked | S4 ops / monitoring completeness claims | Cron metrics runbook exists; production owner + scrape parity undecided |
| **D-009** | Object-storage vendor + evidence DLP/encryption org controls | Platform + Security | blocked | In-app binary evidence upload claims | Ranked **P4**; stub remains non-claim until live |
| **D-010** | Field-outbox multi-device / photo policy for regulated evidence | Product + Compliance | blocked | Offline evidence / multi-device sync claims | Ranked **P3** depth; photos not queued offline today |
| **D-011** | Context Sync provenance retention/purge under legal hold | Compliance + Platform | blocked | Scale-pilot sync-on claims under hold | Provenance runbook exists; retention/purge under hold undecided |
| **D-012** | DEMO_MODE hard-fail outside development (all deploy classes) | Platform / Security | blocked | Staging/prod safety claims for demo isolation | Historically Vercel-production-centric; env-invariant fail-closed still open |

**Operational barrier outside this register:** Terraform remote state (landing-zone / IaC) — see [Terraform remote state](#terraform-remote-state). It does not receive a D-ID because it is not a marketing-claim gate under R-014.

---

## OIDC JIT org provisioning

**Nature:** Organizational (IdP + HR/IAM policy), not purely engineering. **Register:** D-003.

**Prerequisites**

- Contract with IdP (availability, MFA posture, issuer URL stability).
- HR policy answering: JIT default org (`OIDC_JIT_DEFAULT_ORG_ID`), role slug (`OIDC_JIT_ROLE_SLUG`), and offboarding revoke path.
- Operational runbooks for support when users mismatch org expectations.

**Phased unlock**

1. Lab: enable SSO without JIT; validate group/claim mapping assumptions.
2. Pilot org: flip `OIDC_JIT_ENABLED=true` with audit trail for new memberships (`docs/OIDC_JIT_PROVISIONING.md`).
3. General availability: broaden after security review + documented rollback (`OIDC_JIT_ENABLED` off restores prior behavior). Mark D-003 `unblocked` only with recorded policy artifact ID.

**Repo pointers**

- [`docs/OIDC_JIT_PROVISIONING.md`](OIDC_JIT_PROVISIONING.md), [`src/lib/env.ts`](../src/lib/env.ts) (`OIDC_*`).

---

## Durable job queue (e.g. pg-boss)

**Nature:** Architectural split between enqueue (web/cron paths) and workers (persistent process). **Register:** D-004 (stable for ADR-S-005).

**Prerequisites**

- Hosting for workers (Kubernetes `Deployment`, VM, sidecar)—serverless-only deploys alone are a poor fit for long-lived consumers unless using a vendor queue worker.
- DB credentials segregated least-privilege; schema ownership documented (`JOB_QUEUE_ENABLED`, future `PG_BOSS_SCHEMA`).
- Operational visibility into queue depth / dead-letter policy.

**Phased unlock**

1. Identify one **low-risk async** workload (already behind feature flag env per [`docs/JOB_QUEUE.md`](JOB_QUEUE.md)).
2. Provision queue schema + worker in non-prod.
3. Enable in production behind flag with alerts on failure rate — **or** document HTTP cron as the lasting default and mark D-004 `unblocked` with that decision artifact.

**Repo pointers**

- [`docs/JOB_QUEUE.md`](JOB_QUEUE.md), [`src/server/jobs/`](../src/server/jobs/), ranked portfolio **P5**.

---

## Terraform remote state

**Nature:** IaC maturity and cloud landing zone. **Not a R-014 D-ID** (operational barrier only).

**Prerequisites**

- State bucket/container + versioning + encryption-at-rest.
- State locking (e.g. DynamoDB for AWS S3 backend).
- IAM roles for Terraform CI (OIDC preferred) matching least privilege.

**Phased unlock**

1. Instantiate backend from [`infra/terraform/backend.example.tf`](../infra/terraform/backend.example.tf) and [`docs/terraform-remote-state.md`](terraform-remote-state.md).
2. `terraform plan` in CI against staging workspace.
3. Require human approval (`production` GitHub Environment) before `apply` to shared prod state.

---

## Full DSAR automation (beyond intake)

**Nature:** Counsel-driven process intersecting GDPR-style rights, retention/legal hold (`COMPLIANCE.md`), and evidentiary traceability. **Register:** D-002.

**Technical posture (not legal advice)**

- Minimize PII in exports; align with [`docs/DSAR_PROCESS.md`](DSAR_PROCESS.md) and [`COMPLIANCE.md`](../COMPLIANCE.md).
- Ensure `audit_log` and retention jobs remain defensible when erasure is requested (legal hold blocks vs operational anonymization).
- Segregate “self-service export” from “counsel-approved erasure” workflows.

**Phased unlock**

1. Stabilize **intake** at `/dashboard/privacy-requests`; define SLAs internally.
2. Semi-automated export scripts + human review checklist.
3. Automation only after counsel sign-off on scope and exclusions. Mark D-002 `unblocked` only with counsel artifact ID.

---

## Agency-formatted OSHA filing export

**Nature:** Regulatory representation—product must avoid implying filing readiness without validated layouts and counsel review. **Register:** D-001.

**Technical posture**

- Treat [`oshaAgencyExportScaffold.ts`](../src/lib/regulatory/oshaAgencyExportScaffold.ts) / `compliance.regulatoryOsha.*` placeholders as **non-claims**.
- Pursue parity with authoritative agency XSD/PDF/samples; validate fixtures in CI once formats exist.

**Phased unlock**

1. Freeze **canonical record model** (`work_related_injury_illness_record`, establishments) vs export mapping.
2. Build export against **agency sample files** under test harness.
3. Production enablement only after program + counsel alignment (see [`COMPLIANCE.md`](../COMPLIANCE.md)). Mark D-001 `unblocked` only with funding + counsel artifact IDs.

---

## Summary

Use this playbook in **delivery planning** (`ROADMAP.md` barriers are the index; the **Decision register** is the R-014 gate surface; narrative sections are sequencing). Owners are typically Security/Platform for OIDC/state, SRE/Data for queues and monitoring, Compliance/Counsel for DSAR/OSHA/chemicals claim fidelity. Ranked execution lives in [`docs/roadmap/ranked-portfolio.md`](./roadmap/ranked-portfolio.md).
