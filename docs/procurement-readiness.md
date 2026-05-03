# Procurement readiness (strategy Pack)

This document implements the **business and GTM** recommendations from the critique Pack at repo root: [`Autonomous Ehs Management Recommendations.pdf`](../Autonomous%20Ehs%20Management%20Recommendations.pdf).

It covers: ROI framing, pilot structure, economic moat narrative, implementation methodology, and repository presentation—**without** overstating shipped product scope.

**Technical counterpart:** [architecture-map.md](./architecture-map.md).

---

## 1. Positioning (replace generic “AI EHS”)

**Preferred phrase:** *Autonomous compliance operations platform* — emphasizes **workflows, system-of-record data, and evidence**, not chat-only UX.

**Supporting line:** *Labor replacement + compliance infrastructure + system-of-record ownership* (outcomes buyers fund).

---

## 2. Implementation methodology (for enterprise pilots)

| Phase | Activities |
|-------|------------|
| **Discover** | Map sites, existing OSHA/ISO evidence stores, current incident/CAPA flow, roles (EHS, ops, HR). |
| **Configure** | Orgs, sites (`establishment`), RBAC roles, retention policy (with counsel on jurisdictional rules). |
| **Integrate** | Start from [`integration`](../src/server/trpc/routers/integration.ts) event patterns; plan LMS/HRIS/ERP connectors per tenant. |
| **Verify** | User acceptance on incidents → CAPA → audit evidence chain; run parallel reporting vs legacy tools until cutover. |
| **Operate** | Monitor `audit_log`, retention runs, cron health; periodic access reviews. |

---

## 3. Onboarding & customer success (lightweight)

- **Technical onboarding:** README demo path (`demo:up`), devcontainer, [`/api/health`](../src/app/api/health/route.ts).
- **Org onboarding:** First admin signup + `db:seed` linking; document RBAC role intent in internal runbooks (avoid exposing permission keys to end users—see [ehs-technical-writer](../.cursor/skills/ehs-technical-writer-enablement/SKILL.md)).

---

## 4. Enterprise deployment path

- **SaaS:** Vercel + managed Postgres (e.g. Neon) — see [README](../README.md), [`vercel.ts`](../vercel.ts).
- **Container / cluster:** Dockerfile + `deploy/k8s/` + Terraform starters per [devops-sre skill](../.cursor/skills/devops-sre/SKILL.md); cron as `CronJob` hitting secured `/api/cron/*` routes.

**SSO:** Optional **OIDC** via Better Auth Generic OAuth when `OIDC_*` env vars are set ([README Enterprise SSO](../README.md#enterprise-sso-oidc-pilot)). New users still require org membership—no automatic tenant provisioning in this MVP.

---

## 5. Governance model

- **System of record:** PostgreSQL + migrations ([ehs-ims-conventions](../.cursor/rules/ehs-ims-conventions.mdc)).
- **Segregation of duties:** RBAC + sensitive incident reads ([COMPLIANCE.md](../COMPLIANCE.md)).
- **Legal hold / retention:** `data_retention_policy`, cron, audit trail—counsel validates timelines.

---

## 6. ROI worksheet (fill with customer data)

| Metric | Before | After (pilot target) | Notes |
|--------|--------|----------------------|--------|
| Incident closeout time (median days) | | | Pull from `incident` dates; verify definition with customer. |
| CAPA cycle time | | | `corrective_action` status history + due dates. |
| Contractor onboarding days | | | **Wedge** metric—once contractor module milestones exist. |
| Audit preparation hours / year | | | Internal audit programme + evidence attachments. |
| Repeat findings rate | | | Link findings to CAPA effectiveness reviews. |

Use this table in **oneFacility pilots** (PDF pilot case study standard).

---

## 7. Pilot case study template (proof beats positioning)

1. **Scope:** One site or one workflow (e.g. incident → CAPA → closure evidence).
2. **Baseline:** Process map + time study + baseline KPIs (above table).
3. **Intervention:** Dates live on Autonomous EHS; training for roles; integrations cutover plan.
4. **Results:** Measured deltas + qualitative adoption (supervisor quotes).
5. **Artifacts:** Redacted screenshots, anonymized metrics—align with privacy policy.

Filled template: [case-studies/pilot-template.md](./case-studies/pilot-template.md). Store approved narratives under `docs/case-studies/`.

---

## 8. Economic moat (investor Q&A)

Honest **strong answers** aligned to this repo:

| Moat angle | Why it fits |
|------------|-------------|
| **Embedded operational data** | Incident/CAPA/training/audit graph in one Postgres schema—switching cost once workflows run here. |
| **Defensible evidence chain** | `audit_log` + retention + RBAC—hard to replicate with ad hoc spreadsheets + chatbots. |
| **Workflow + AI boundary** | Deterministic transitions + validated LLM outputs reduce “thin wrapper” risk. |
| **Compliance depth** | OSHA sidecar, Tier II–oriented chemical tables, retention services—see COMPLIANCE.md. |

Avoid claiming **contractor network effects** until network features exist.

---

## 9. Initial wedge: contractor compliance (PDF §5)

**Strategic focus:** High-friction contractor onboarding, training proof, insurance/permit tracking, renewals.

**Current codebase:** `external_party` + `external_party_credential` (see [architecture-map §10](./architecture-map.md)); general IMS + training + audits. **Roadmap:** visitor kiosks, automated renewal queues, full HRIS-backed contractor lifecycle.

---

## 10. Repository presentation checklist (PDF)

| Item | Location / action |
|------|-------------------|
| Strong README | [README.md](../README.md) — positioning + links |
| Architecture diagrams | [architecture-map.md](./architecture-map.md), README Mermaid |
| Workflow examples | [workflow-depth.md](./workflow-depth.md) |
| Deployment | README + [devops-sre](../.cursor/skills/devops-sre/SKILL.md) |
| Product screenshots | Add `docs/screenshots/` when marketing supplies assets |
| Use case documentation | [user-manual-ehs-console.md](./user-manual-ehs-console.md) |
| Case studies | `docs/case-studies/` when available |
| ROI examples | §6 above |

---

## 11. Security diligence pointers

For **SAST / appsec** reviews, point auditors to [SECURITY.md](../SECURITY.md), [devsecops-sast skill](../.cursor/skills/devsecops-sast-audit/SKILL.md), and high-risk paths: [`proxy.ts`](../src/proxy.ts), auth, tRPC context, cron auth, RAG ingest URLs, `safeAppRelativePath` for redirects.
