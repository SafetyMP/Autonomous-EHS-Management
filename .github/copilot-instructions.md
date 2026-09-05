# GitHub Copilot instructions

Self-hosted EHS console: incidents, CAPA, audits, TRIR-style metrics.
PostgreSQL is the system of record. Optional AI never closes records.

## Verify

Run `npm run verify` (lint + tsc + Vitest) or `./scripts/verify.sh`
(full local gate: verify + audit-matrix greps + threat-model).
Do not skip or weaken these gates.

## HITL

AI may suggest wording or retrieve policy excerpts.
Humans close incidents, CAPAs, and audit findings.
Never auto-close a regulated record from model output.

## Handbook

Read [AGENTS.md](../AGENTS.md) first (community contract, Always / Ask first / Never). Factory overlay: [docs/factory-overlay.md](../docs/factory-overlay.md).
