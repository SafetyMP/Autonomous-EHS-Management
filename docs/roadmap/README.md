# Roadmap design documents

Engineering specs and playbooks derived from enterprise diligence feedback. Design targets and historical problem statements remain here; each document identifies its implementation status. Use the [current user manual](../user-manual-ehs-console.md) and [corporate navigation decision](../adr/ADR-UX-008-corporate-navigation.md) for the shipped navigation and overview, rather than old wireframes or Today/Capture/Decide/Prove labels.

| Document | Theme | Status |
|----------|-------|--------|
| [ranked-portfolio.md](./ranked-portfolio.md) | P0–P5 maturation ranking, LOC baselines, partnership epic contracts (R-003 / R-013) | Site delivery ADR-S-002 |
| [action-queue-dashboard-spec.md](./action-queue-dashboard-spec.md) | Unified next-action UX and `tasks.actionQueue` API | Phase A/B shipped; Phase C in progress |
| [hris-portco-integration-playbook.md](./hris-portco-integration-playbook.md) | SCIM, multi-org OIDC JIT, Workday/ADP/BambooHR iPaaS recipes | **Phase 1–2 shipped** (identity + runbooks); Phase 3 reconciliation/LMS depth shipped; native Workday OAuth optional |
| [portco-deferred-connectors.md](./portco-deferred-connectors.md) | Explicit non-goals (native HRIS OAuth, customer MCP, VMS kiosks) | Reference for RFP honesty — not scheduled until customer demand |

**Architecture decisions:** [../adr/ADR-S-002-ranked-portfolio-barriers.md](../adr/ADR-S-002-ranked-portfolio-barriers.md), [../adr/0001-mcp-context-sync-strategy.md](../adr/0001-mcp-context-sync-strategy.md)

**Procurement / RFP:** [../procurement-integrations-appendix.md](../procurement-integrations-appendix.md)

**Full docs index:** [../README.md](../README.md)
