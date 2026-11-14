## Problem and resulting behavior

Describe the user task or defect, then the behavior after this change. Link the issue and include relevant screenshots using synthetic data.

- Fixes / refs:
- Affected experience: full application / static walkthrough / documentation / deployment

## Scope and boundaries

- [ ] Corporate navigation / overview / incident-to-CAPA journey
- [ ] Other application UI
- [ ] tRPC routers / server
- [ ] Database schema / migrations
- [ ] Authentication / organization scope / RBAC
- [ ] Compliance / retention / RAG / AI gateway
- [ ] Public synthetic walkthrough (`demo/`)
- [ ] Documentation / discovery metadata
- [ ] CI/CD / infrastructure

Explain relevant workflow, permission, deployment, or compatibility effects. For regulated changes, link the Compliance issue and state migration, rollback, retention, and audit impact. For walkthrough changes, confirm that examples remain synthetic and read-only.

## Verification evidence

Record **passed**, **failed**, or **not run** with a reason and command output or Actions run link. Follow AGENTS.md for required checks; this table does not waive merge gates. Link results for the actual PR commit.

| Check | Result and evidence |
|---|---|
| Lint, TypeScript, Vitest (`npm run verify`) | |
| Repository checks (`./scripts/verify.sh`) | |
| Applicable full-application integration / smoke browser tests | |
| Applicable accessibility / responsive checks | |
| Static walkthrough (`npx playwright test --config playwright.demo.config.ts`) when affected | |
| Threat-model / adversarial checks when applicable | |
| Supply-chain and other required CI jobs | |
| Documentation links and documented setup changes when affected | |

## Review and deployment

- Independent review findings and resolution (for substantial changes):
- Remaining limitations or follow-up work:
- Deployment or external validation, if performed (otherwise state not performed):

## Checklist

- [ ] Existing authentication, organization scope, RBAC, and human approval boundaries are preserved, or authorized changes are explicitly described and tested.
- [ ] Current documentation reflects changed behavior; historical evidence is identified as historical.
- [ ] No secrets, personal data, or operational incident records are included.
