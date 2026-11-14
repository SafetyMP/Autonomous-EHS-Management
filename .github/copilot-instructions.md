# GitHub Copilot instructions

Autonomous EHS is a self-hosted corporate environmental, health, and safety console: incidents, corrective actions (CAPA), audits, and TRIR-style metrics. PostgreSQL is the system of record. Optional AI never closes records.

The full application (`src/`, source/container distribution) and the public synthetic read-only Pages walkthrough (`demo/`) are separate artifacts. The walkthrough has no authentication, API, or database. `npm run demo:up` prepares the full local app, not Pages. Preserve that boundary.

## Verify

Run `npm run verify` (lint + tsc + Vitest) or `./scripts/verify.sh`
(full local gate: verify + audit-matrix greps + threat-model).
Do not skip or weaken these gates.

For `demo/` changes also run `npx playwright test --config playwright.demo.config.ts`. Full-app smoke uses `npm run test:e2e:smoke` against the documented seeded database and credentials. Report local verification, remote CI, and deployed-site evidence separately.

## HITL

AI may suggest wording or retrieve policy excerpts.
Humans close incidents, CAPAs, and audit findings.
Never auto-close a regulated record from model output.

## Handbook

Read [AGENTS.md](../AGENTS.md) first (community contract, Always / Ask first / Never and task-specific source map), then retrieve only the docs needed. Current operator guidance starts at [docs/README.md](../docs/README.md).

Shared corporate navigation is defined in `src/lib/dashboard-nav-links.ts`. Authentication, protected procedures, organization scoping, RBAC, and workflow transitions are enforced in the server and `src/lib/`; navigation visibility does not grant authority. Preserve the incident-to-corrective-action journey and existing permissions.

The [factory overlay](../docs/factory-overlay.md) and dated QA/ADR records retain historical contracts and evidence. They are not current deployment proof or instructions to reactivate archived harness tooling.

## Coding standards

Follow path-specific files in [`.github/instructions/`](instructions/). Copilot code review loads [`.github/skills/code-review/`](skills/code-review/).
