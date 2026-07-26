# Documentation index

Canonical map of repository documentation. **Start at the root [README](../README.md)** for quick start and deploy; use this index when you need a specific audience or workflow.

**New here?** [Quick start](../README.md#quick-start) → [Turnkey local demo](../README.md#turnkey-local-demo-docker-postgres) → [Module maturity](./module-maturity.md) (honest shipped vs planned scope).

## By role

| Role | Start here |
|------|------------|
| **Field user / safety manager** | [user-manual-ehs-console.md](./user-manual-ehs-console.md) (Calm Focus Today: Your work first, KPIs collapsed) |
| **Contributor / agent** | [AGENTS.md](../AGENTS.md) → [codebase-layout.md](./codebase-layout.md) |
| **UX / a11y reviewer** | [qa/calm-focus-final-dossier.md](./qa/calm-focus-final-dossier.md), [qa/a11y-test-plan.md](./qa/a11y-test-plan.md), ADRs UX-005…007 |
| **Architect / diligence** | [architecture-map.md](./architecture-map.md), [workflow-depth.md](./workflow-depth.md), [CONTEXT.md](../CONTEXT.md) |
| **Procurement / RFP** | [procurement-readiness.md](./procurement-readiness.md), [procurement-integrations-appendix.md](./procurement-integrations-appendix.md), [portco-module-value-assessment.md](./portco-module-value-assessment.md) |
| **Platform / SRE (self-host)** | [self-host-quickstart.md](./self-host-quickstart.md), [runbooks/](./runbooks/), [JOB_QUEUE.md](./JOB_QUEUE.md) |
| **Integration engineer** | [integration-inbound-contract.md](./integration-inbound-contract.md), [integration-connector-mapping.md](./integration-connector-mapping.md), [roadmap/hris-portco-integration-playbook.md](./roadmap/hris-portco-integration-playbook.md) |
| **QA / UAT** | [qa/](./qa/) |
| **Compliance / DPO** | [COMPLIANCE.md](../COMPLIANCE.md), [DSAR_PROCESS.md](./DSAR_PROCESS.md), [regulatory-posture-boundary.md](./regulatory-posture-boundary.md), [regulatory/](./regulatory/) (Heat NEP, EPCRA 2027, ISO 14001:2026) |
| **Open source adopter / fork** | [GOVERNANCE.md](../GOVERNANCE.md), [open-source-tco.md](./open-source-tco.md), [module-maturity.md](./module-maturity.md) |

## Open source & project health

Evergreen OSS positioning: long-lived, forkable, tenant-owned Postgres—not a demo dump or mandatory SaaS lock-in.

| Document | Topic |
|----------|--------|
| [GOVERNANCE.md](../GOVERNANCE.md) | Maintainers, merge bar, releases, security, forks |
| [open-source-tco.md](./open-source-tco.md) | License + self-host economics |
| [module-maturity.md](./module-maturity.md) | Shipped vs in-progress modules (honest scope) |
| [ROADMAP.md](../ROADMAP.md) | Direction, barriers, community |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | PR workflow |
| [SECURITY.md](../SECURITY.md) | Vulnerability reporting |
| [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) | Community standards |

## Architecture & product depth

| Document | Topic |
|----------|--------|
| [architecture-map.md](./architecture-map.md) | End-to-end system map, integrations, retention |
| [workflow-depth.md](./workflow-depth.md) | State machines, `audit_log`, action queue |
| [approval-workflow.md](./approval-workflow.md) | CAPA approval gate |
| [module-maturity.md](./module-maturity.md) | Feature maturity by module |
| [ai-governed-intake.md](./ai-governed-intake.md) | Assistive AI boundaries |
| [offline-field-outbox.md](./offline-field-outbox.md) | Field offline replay |
| [codebase-layout.md](./codebase-layout.md) | `src/` directory guide |
| [qa/calm-focus-final-dossier.md](./qa/calm-focus-final-dossier.md) | Calm Focus Gen-1 console UX package summary |
| [qa/ia-task-mode-map.md](./qa/ia-task-mode-map.md) | Today / Capture / Decide / Prove IA map |

## Integrations & identity

| Document | Topic |
|----------|--------|
| [integration-inbound-contract.md](./integration-inbound-contract.md) | `POST /api/integration/inbound` envelopes |
| [integration-connector-mapping.md](./integration-connector-mapping.md) | iPaaS field mapping notes |
| [operational-webhooks.md](./operational-webhooks.md) | Outbound HTTPS event delivery |
| [OIDC_JIT_PROVISIONING.md](./OIDC_JIT_PROVISIONING.md) | Enterprise SSO JIT rules |
| [roadmap/hris-portco-integration-playbook.md](./roadmap/hris-portco-integration-playbook.md) | SCIM, HRIS, PortCo identity |
| [roadmap/portco-deferred-connectors.md](./roadmap/portco-deferred-connectors.md) | Explicit non-goals for RFP honesty |

## Operations & deploy

| Document | Topic |
|----------|--------|
| [self-host-quickstart.md](./self-host-quickstart.md) | Docker, Kubernetes, crons, worker |
| [cursor-tool-connections-deployment.md](./cursor-tool-connections-deployment.md) | IDE tools vs Git-authoritative ship path |
| [JOB_QUEUE.md](./JOB_QUEUE.md) | pg-boss worker |
| [terraform-remote-state.md](./terraform-remote-state.md) | IaC remote state notes |
| [runbooks/](./runbooks/) | Day-2 operator runbooks |

## Regulatory programme aids (July 2026 pack)

| Document | Topic |
|----------|--------|
| [regulatory/heat-nep-cpl-03-00-024.md](./regulatory/heat-nep-cpl-03-00-024.md) | Heat NEP Appendix I program aid (eff. 2026-04-10) |
| [regulatory/epcra-hazard-categories-2027.md](./regulatory/epcra-hazard-categories-2027.md) | HCS 2024 / EPCRA RY2027 hazard categories |
| [regulatory/iso-14001-2026-transition.md](./regulatory/iso-14001-2026-transition.md) | ISO 14001:2026 transition field map |
| [regulatory-posture-boundary.md](./regulatory-posture-boundary.md) | Program-of-record vs agency/certification claims |

## Procurement & GTM

| Document | Topic |
|----------|--------|
| [procurement-readiness.md](./procurement-readiness.md) | Pilot workbook, positioning |
| [procurement-portco-integration-budget.md](./procurement-portco-integration-budget.md) | Integration cost framing |
| [open-source-tco.md](./open-source-tco.md) | License + illustrative TCO |
| [competitive-intelligence-market-viability.md](./competitive-intelligence-market-viability.md) | Market positioning (engineering) |
| [case-studies/](./case-studies/) | Synthetic pilot narratives + publication workflow |
| [barrier-resolution-playbook.md](./barrier-resolution-playbook.md) | Adoption blockers |

## Roadmap & ADRs

| Document | Topic |
|----------|--------|
| [roadmap/README.md](./roadmap/README.md) | Engineering specs index |
| [roadmap/action-queue-dashboard-spec.md](./roadmap/action-queue-dashboard-spec.md) | Unified action queue (Phase A/B shipped) |
| [adr/0001-mcp-context-sync-strategy.md](./adr/0001-mcp-context-sync-strategy.md) | Context Sync vs customer MCP |
| [adr/ADR-UX-001-task-first-ia.md](./adr/ADR-UX-001-task-first-ia.md) | Task-first IA (Today / Capture / Decide / Prove) |
| [adr/ADR-UX-002-shell-tokens-rbac-honesty.md](./adr/ADR-UX-002-shell-tokens-rbac-honesty.md) | Sole shell, tokens, RBAC-honest field hide |
| [adr/ADR-UX-003-status-region-first-outbox.md](./adr/ADR-UX-003-status-region-first-outbox.md) | Status-region-first field outbox |
| [adr/ADR-UX-004-a11y-ci-topology.md](./adr/ADR-UX-004-a11y-ci-topology.md) | Dedicated Playwright `a11y` project |
| [adr/ADR-UX-005-calm-focus-tokens-typography-chrome.md](./adr/ADR-UX-005-calm-focus-tokens-typography-chrome.md) | Calm Focus tokens / typography / chrome |
| [adr/ADR-UX-006-progressive-disclosure-today-home.md](./adr/ADR-UX-006-progressive-disclosure-today-home.md) | Today density + progressive disclosure |
| [adr/ADR-UX-007-platform-status-disclosure-a11y-visual.md](./adr/ADR-UX-007-platform-status-disclosure-a11y-visual.md) | Maturity banner, visual digests, WCAG 3 claim lint |

## Subdirectories

- **[qa/](./qa/)** — Test strategy, UAT checklists, auditability matrix, PortCo pilot scope
- **[runbooks/](./runbooks/)** — HRIS connectors, cron metrics, audit log governance, Context Sync
- **[case-studies/](./case-studies/)** — Pilot templates and synthetic PortCo narratives
- **[roadmap/](./roadmap/)** — Design specs and integration playbooks
- **[adr/](./adr/)** — Architecture decision records

## Root-level governance (outside `docs/`)

| File | Purpose |
|------|---------|
| [GOVERNANCE.md](../GOVERNANCE.md) | Evergreen OSS: maintainers, releases, community, forks |
| [AGENTS.md](../AGENTS.md) | Site contract, CI gates, threat model, skills index |
| [specs/threat-model.yaml](../specs/threat-model.yaml) | Tier-3 adversarial cells / deny cases |
| [CONTEXT.md](../CONTEXT.md) | Stack pins, API map, anti-patterns |
| [COMPLIANCE.md](../COMPLIANCE.md) | Retention, legal hold, regulatory scope |
| [REPO_SETUP.md](../REPO_SETUP.md) | GitHub About, rulesets, Environments, OIDC promote |
| [ROADMAP.md](../ROADMAP.md) | Product backlog (high level) |

When you add or retire a doc under `docs/`, update this index and any adopter table in the root README.
