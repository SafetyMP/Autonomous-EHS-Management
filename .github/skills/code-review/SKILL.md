---
name: code-review
description: "Review EHS console PRs for HITL, audit-log mutations, and verify gates. Use on pull requests that touch incidents, CAPA, audits, Drizzle schema, tRPC, or CI. Flag AI auto-closing regulated records."
---

# Copilot code review — Autonomous-EHS-Management

Use this skill when reviewing a pull request in this repository.

Review for a **self-hosted EHS console**. PostgreSQL is the system of record.

- AI is proposal-only. Reject diffs that close incidents, CAPAs, or audit findings from model output.
- Persist regulated changes through permission-gated mutations with audit logs.
- Do not claim OSHA certification or official filings from in-app metrics.
- Preferred verify: `npm run verify` or `./scripts/verify.sh`.


## Always flag

- Secrets, `.env` values, private keys, or real personal data in the diff
- Weakened or skipped verify / lint / typecheck / adversarial gates
- Invented success (prose claiming a gate passed with no command output)
- Fail-open authorization, skipped human approval, or agents recording `--actor user`

## Never request

- Drive-by major upgrades, formatter churn, or unrelated refactors
- Softening honesty disclaimers or certification claims
