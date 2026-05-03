# Barrier resolution playbook

This document complements the **Barriers** table in [`ROADMAP.md`](../ROADMAP.md): it proposes **ownership**, **preconditions**, and **phases** to move each item from scaffold to controlled production posture. Nothing here is legal advice; engage counsel where noted.

---

## OIDC JIT org provisioning

**Nature:** Organizational (IdP + HR/IAM policy), not purely engineering.

**Prerequisites**

- Contract with IdP (availability, MFA posture, issuer URL stability).
- HR policy answering: JIT default org (`OIDC_JIT_DEFAULT_ORG_ID`), role slug (`OIDC_JIT_ROLE_SLUG`), and offboarding revoke path.
- Operational runbooks for support when users mismatch org expectations.

**Phased unlock**

1. Lab: enable SSO without JIT; validate group/claim mapping assumptions.
2. Pilot org: flip `OIDC_JIT_ENABLED=true` with audit trail for new memberships (`docs/OIDC_JIT_PROVISIONING.md`).
3. General availability: broaden after security review + documented rollback (`OIDC_JIT_ENABLED` off restores prior behavior).

**Repo pointers**

- [`docs/OIDC_JIT_PROVISIONING.md`](OIDC_JIT_PROVISIONING.md), [`src/lib/env.ts`](../src/lib/env.ts) (`OIDC_*`).

---

## Durable job queue (e.g. pg-boss)

**Nature:** Architectural split between enqueue (web/cron paths) and workers (persistent process).

**Prerequisites**

- Hosting for workers (Kubernetes `Deployment`, VM, sidecar)—serverless-only deploys alone are a poor fit for long-lived consumers unless using a vendor queue worker.
- DB credentials segregated least-privilege; schema ownership documented (`JOB_QUEUE_ENABLED`, future `PG_BOSS_SCHEMA`).
- Operational visibility into queue depth / dead-letter policy.

**Phased unlock**

1. Identify one **low-risk async** workload (already behind feature flag env per [`docs/JOB_QUEUE.md`](JOB_QUEUE.md)).
2. Provision queue schema + worker in non-prod.
3. Enable in production behind flag with alerts on failure rate.

**Repo pointers**

- [`docs/JOB_QUEUE.md`](JOB_QUEUE.md), [`src/server/jobs/`](../src/server/jobs/).

---

## Terraform remote state

**Nature:** IaC maturity and cloud landing zone.

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

**Nature:** Counsel-driven process intersecting GDPR-style rights, retention/legal hold (`COMPLIANCE.md`), and evidentiary traceability.

**Technical posture (not legal advice)**

- Minimize PII in exports; align with [`docs/DSAR_PROCESS.md`](DSAR_PROCESS.md) and [`COMPLIANCE.md`](../COMPLIANCE.md).
- Ensure `audit_log` and retention jobs remain defensible when erasure is requested (legal hold blocks vs operational anonymization).
- Segregate “self-service export” from “counsel-approved erasure” workflows.

**Phased unlock**

1. Stabilize **intake** at `/dashboard/privacy-requests`; define SLAs internally.
2. Semi-automated export scripts + human review checklist.
3. Automation only after counsel sign-off on scope and exclusions.

---

## Agency-formatted OSHA filing export

**Nature:** Regulatory representation—product must avoid implying filing readiness without validated layouts and counsel review.

**Technical posture**

- Treat [`oshaAgencyExportScaffold.ts`](../src/lib/regulatory/oshaAgencyExportScaffold.ts) / `compliance.regulatoryOsha.*` placeholders as **non-claims**.
- Pursue parity with authoritative agency XSD/PDF/samples; validate fixtures in CI once formats exist.

**Phased unlock**

1. Freeze **canonical record model** (`work_related_injury_illness_record`, establishments) vs export mapping.
2. Build export against **agency sample files** under test harness.
3. Production enablement only after program + counsel alignment (see [`COMPLIANCE.md`](../COMPLIANCE.md)).

---

## Summary

Use this playbook in **delivery planning** (`ROADMAP.md` barriers are the index; here is sequencing). Owners are typically Security/Platform for OIDC/state, SRE/Data for queues, Compliance/Counsel for DSAR/OSHA export fidelity.
