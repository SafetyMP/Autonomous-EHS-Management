# QA & acceptance documentation

Test strategy, staging checklists, and regulated-mutation auditability. Merge gate commands live in [AGENTS.md](../../AGENTS.md).

| Document | Purpose |
|----------|---------|
| [risk-based-coverage-matrix.md](./risk-based-coverage-matrix.md) | Area × automation coverage |
| [mutation-auditability-matrix.md](./mutation-auditability-matrix.md) | Which mutations write `audit_log` |
| [rag-redaction-runbook.md](./rag-redaction-runbook.md) | RAG redaction defaults + `RAG_READ` / `AI_DRAFT_USE` / `rag:ingest` gates |
| [retention-class-inventory.md](./retention-class-inventory.md) | Cron-covered vs policy-only retention classes |
| [staging-uat-desk-to-field.md](./staging-uat-desk-to-field.md) | Business UAT desk-to-field checklist |
| [portco-staging-pilot.md](./portco-staging-pilot.md) | PortCo integration staging verification |
| [portco-tier1-pilot-scope.md](./portco-tier1-pilot-scope.md) | Tier 1 pilot module scope |
| [portco-uat-signoff-record.md](./portco-uat-signoff-record.md) | UAT sign-off template |

**Automation helpers:** `npm run verify`, `npm run verify:all`, `npm run audit:matrix-greps`, `npm run portco:pilot-verify`.

**Skills (Cursor):** [senior-qa-automation](../../.cursor/skills/senior-qa-automation/SKILL.md), [qa-engineer](../../.cursor/skills/qa-engineer/SKILL.md), [ehs-program-director-uat](../../.cursor/skills/ehs-program-director-uat/SKILL.md).
