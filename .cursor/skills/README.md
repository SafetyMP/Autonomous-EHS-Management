# Cursor agent skills (Autonomous EHS)

These `SKILL.md` files steer **persona**, **checklists**, and **repo-local sources of truth** for AI agents and humans. **Load the relevant skill at session start** when the user’s task matches its trigger (see each file’s intro).

| Skill | Path | When to use |
|--------|------|-------------|
| **Corporate compliance & data governance** | [corporate-compliance-data-governance/SKILL.md](corporate-compliance-data-governance/SKILL.md) | Retention, legal hold, PII/RAG, OSHA sidecar, Tier II schema, `compliance.*` API, `COMPLIANCE.md`, audit lifecycle |
| Context Guardian (architecture docs only) | [context-guardian/SKILL.md](context-guardian/SKILL.md) | CONTEXT.md, Mermaid, directory governance **without** shipping app logic |
| EHS Program Director UAT | [ehs-program-director-uat/SKILL.md](ehs-program-director-uat/SKILL.md) | Business acceptance, auditability, field workflows |
| Staff engineer code review | [staff-engineer-code-review/SKILL.md](staff-engineer-code-review/SKILL.md) | DRY/SOLID, smells-first review |
| Senior QA automation | [senior-qa-automation/SKILL.md](senior-qa-automation/SKILL.md) | Vitest / Playwright / tRPC test patterns |
| UI/UX field accessibility | [ui-ux-field-accessibility/SKILL.md](ui-ux-field-accessibility/SKILL.md) | ARIA, keyboard, stress UX |
| EHS technical writer | [ehs-technical-writer-enablement/SKILL.md](ehs-technical-writer-enablement/SKILL.md) | Manuals, SOPs, in-app copy |
| 2026 innovation auditor | [2026-innovation-auditor/SKILL.md](2026-innovation-auditor/SKILL.md) | Innovation / product audit lens |
| **DevSecOps / SAST audit** | [devsecops-sast-audit/SKILL.md](devsecops-sast-audit/SKILL.md) | Offensive SAST, OWASP-oriented logic review, strict vulnerability report format |
| **DevOps / SRE** | [devops-sre/SKILL.md](devops-sre/SKILL.md) | Containers, Kubernetes/IaC, CI/CD deploy, observability wiring, FinOps / scale-to-zero — not product logic |
| **Staff Release Engineer & GitOps Architect** | [staff-release-gitops-architect/SKILL.md](staff-release-gitops-architect/SKILL.md) | GitHub Actions/rulesets/Environments, OIDC deploy auth, semantic-release, Dependabot & supply-chain gates, attestations/`REPO_SETUP.md` — not app/RBAC/schema |
| **DevEx Engineer** | [devex-engineer/SKILL.md](devex-engineer/SKILL.md) | Demo stack (Docker/pgvector, devcontainer), realistic seeds, `DEMO_*` / read-only sandbox, README quick starts, low-friction onboarding without weakening prod auth |

**Workspace rule:** [.cursor/rules/compliance-data-governance.mdc](../rules/compliance-data-governance.mdc) — requestable hook for complianceScope tasks.

**Handbook:** [AGENTS.md](../../AGENTS.md) — merge verification, CI/containers/Kubernetes index, and skill list.
