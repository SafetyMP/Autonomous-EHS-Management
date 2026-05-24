# Procurement readiness (strategy Pack)

This document implements the **business and GTM** recommendations from the critique Pack at repo root: [`Autonomous Ehs Management Recommendations.pdf`](../Autonomous%20Ehs%20Management%20Recommendations.pdf).

It covers: ROI framing, pilot structure, economic moat narrative, implementation methodology, and repository presentation—**without** overstating shipped product scope.

**Technical counterpart:** [architecture-map.md](./architecture-map.md).

**Market / competitor snapshot (engineering-grounded):** [competitive-intelligence-market-viability.md](./competitive-intelligence-market-viability.md).

---

## 1. Positioning (replace generic “AI EHS”)

**Preferred phrase:** *Autonomous compliance operations platform* — emphasizes **workflows, system-of-record data, and evidence**, not chat-only UX. **“Autonomous”** here means **scheduled reliability, SLA escalation records, integrations, and field outbox replay**, with optional **proposal-only AI** ([README](../README.md), [docs/ai-governed-intake.md](./ai-governed-intake.md))—not LLM-owned approvals or regulatory transitions.

**Supporting line:** *Labor replacement + compliance infrastructure + system-of-record ownership* (outcomes buyers fund).

---

## 2. Implementation methodology (for enterprise pilots)

| Phase | Activities |
|-------|------------|
| **Discover** | Map sites, existing OSHA/ISO evidence stores, current incident/CAPA flow, roles (EHS, ops, HR). |
| **Configure** | Orgs, sites (`establishment`), RBAC roles, retention policy (with counsel on jurisdictional rules). |
| **Integrate** | Start from [`integration`](../src/server/trpc/routers/integration.ts) event patterns; plan LMS/HRIS/ERP connectors per tenant. **Diligence appendix:** [procurement-integrations-appendix.md](./procurement-integrations-appendix.md) (HRIS limits, Context Sync vs MCP). |
| **Verify** | User acceptance on incidents → CAPA → audit evidence chain; run parallel reporting vs legacy tools until cutover. Deeper staging checklist: [qa/staging-uat-desk-to-field.md](./qa/staging-uat-desk-to-field.md); transactional audit expectations (`writeAuditLog`): [qa/mutation-auditability-matrix.md](./qa/mutation-auditability-matrix.md). |
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

### Customer-facing integrations vs internal Cursor tooling

**Procurement and RFP diligence** should distinguish what the **tenant** receives from what **engineering** uses to build and operate the product.

| Scope | Examples in this repo | Diligence framing |
|-------|----------------------|-------------------|
| **Customer / tenant integrations** | SSO (OIDC pilot), [`integration`](../src/server/trpc/routers/integration.ts) patterns, inbound envelopes and webhooks, HRIS/sync services, exports and audit evidence chains | Part of **solution fit**, security review, and DPIA / BAA discussions as applicable |
| **Internal engineering tooling only** | Cursor **MCP servers** (Vercel, Neon, clouds, Slack), IDE “tool connections,” [`@cursor/sdk`](https://cursor.com/docs) automation for internal bots | **Vendor toolchain** for contributors—**not** something you list as a customer integration unless you explicitly resell or embed it (this repo does **not**) |

**Operational note:** Production deploys remain **GitHub Actions** + **Vercel and/or EKS** per [REPO_SETUP.md](../REPO_SETUP.md). Cursor connections are **optional ergonomics** around those systems; they must not become a shadow path for production secrets or approvals. See **[cursor-tool-connections-deployment.md](./cursor-tool-connections-deployment.md)**.

### Staging acceptance / QA artifacts

- **Business-facing staging / UAT checklist:** [staging-uat-desk-to-field.md](./qa/staging-uat-desk-to-field.md) — desk-to-field acceptance for pilots and releases.
- **Mutation auditability inventory:** [mutation-auditability-matrix.md](./qa/mutation-auditability-matrix.md) — which IMS mutations write `audit_log` (spot-check for procurement evidence; coverage is intentionally partial per [COMPLIANCE.md](../COMPLIANCE.md)).
- **Buyer clarity:** UAT scope should not imply the app is an **agency system of record** or filing-ready regulator submission path unless counsel and the customer define that outside the product—see disclaimers in [COMPLIANCE.md](../COMPLIANCE.md) (product positioning table and residual risks).

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
| Deployment | README + [devops-sre](../.cursor/skills/devops-sre/SKILL.md) + optional [cursor-tool-connections-deployment](./cursor-tool-connections-deployment.md) (Cursor MCP scope) |
| Product screenshots | Add `docs/screenshots/` when marketing supplies assets |
| Use case documentation | [user-manual-ehs-console.md](./user-manual-ehs-console.md) |
| Case studies | `docs/case-studies/` when available |
| OSS / TCO snapshot | [`open-source-tco.md`](./open-source-tco.md) |

## 11. Security diligence pointers

For **SAST / appsec** reviews, point auditors to [SECURITY.md](../SECURITY.md), [devsecops-sast skill](../.cursor/skills/devsecops-sast-audit/SKILL.md), and high-risk paths: [`proxy.ts`](../src/proxy.ts), auth, tRPC context, cron auth, RAG ingest URLs, `safeAppRelativePath` for redirects.

---

## 12. RFP / diligence risk register (honest gaps)

Use this in **enterprise questionnaires** so buyers do not assume filing-ready agency exports or suite breadth that is not yet shipped.

| Risk / question | Current state | Buyer-facing statement |
|-----------------|---------------|-------------------------|
| **OSHA agency-formatted electronic filing** | **`compliance.regulatoryOsha.agencyExportPlaceholder` only** — not submission-ready ([`ROADMAP.md`](../ROADMAP.md) barriers, [`oshaAgencyExportScaffold.ts`](../src/lib/regulatory/oshaAgencyExportScaffold.ts)). | Program data and internal injury/illness exports may be available; **direct agency submission formats** require counsel review and additional product work. |
| **Full DSAR automation** | Intake / policy surfaces exist; end-to-end export/erasure needs **counsel process** ([`ROADMAP.md`](../ROADMAP.md)). | Privacy tooling is **governance-aligned**, not a one-click “erase everything” guarantee. |
| **Turnkey HRIS / Workday connector** | **`hris_membership_sync`** updates site for **existing** members only — no SCIM, no named vendor modules ([procurement-integrations-appendix.md](./procurement-integrations-appendix.md), [hris-portco-integration-playbook.md](./roadmap/hris-portco-integration-playbook.md)). | Integration **plumbing ships**; **roster provisioning and certified connectors** are roadmap — plan iPaaS middleware for pilots. |
| **Customer MCP server** | **Context Sync REST** ships; native MCP server **does not** ([adr/0001-mcp-context-sync-strategy.md](./adr/0001-mcp-context-sync-strategy.md)). | Agent read access is **governed REST**, not MCP-branded; Cursor MCP is **internal dev tooling only**. |
| **Occupational health clinic depth** | Not targeted at Cority-class medical surveillance in v1. | Occupational health programs may need a **specialist module** or partner system. |
| **Environmental regulatory permits vs PTW** | **Permits to work** (`/dashboard/permits`) are **field authorization** (PTW). **Environmental permits** (`/dashboard/environmental-permits`) are a **regulatory register** (metadata, renewals, conditions)—**not** agency filing-ready by default (see [COMPLIANCE.md](../COMPLIANCE.md)). | Buyers should map **Cority/Enablon-style** permit tracking to the environmental permit module + obligations/monitoring; **do not** conflate with PTW. |
| **Risk assessment / JSA roster** | Task- and site-based assessments with optional step rows; **not** a complete replacement for bowtie/LOPA tooling. | Position as **governed IMS register** with audit trail; depth vs Velocity/Intelex is **customer validation** in pilot. |

Track resolution in [`docs/barrier-resolution-playbook.md`](./barrier-resolution-playbook.md) when owners are assigned.
