# Audit log governance (operators)

**Audience:** IMS administrators, operators, security reviewers. **Not** legal counsel. **Not legal advice.**

## Purpose

PostgreSQL **`audit_log`** holds **transactional** records of instrumented mutations (who did what to which logical entity). That is distinct from ISO-style **internal audit programme** artefacts (planned audits, programme rows, findings) surfaced under **`/dashboard/audits`** in the Assurance section of navigation ([`src/lib/dashboard-nav-links.ts`](../../src/lib/dashboard-nav-links.ts)).

For reviewing **transactional** audit rows in the UI, use **Audit trail** → **`/dashboard/audit-trail`**. Listing and CSV export are served by **`compliance.auditTrail`** ([`src/server/trpc/routers/auditTrailRouter.ts`](../../src/server/trpc/routers/auditTrailRouter.ts)); access requires **`audit_trail:read`** (see [`src/lib/rbac.ts`](../../src/lib/rbac.ts)).

## Population

Regulated routers and services call **`writeAuditLog`** (typically near successful commits). Coverage is intentionally **explicit per code path**: new features may ship without parity until instrumentation is added. Treat **incomplete transactional coverage** as a standing operational and assurance risk—the living checklist is **`docs/qa/mutation-auditability-matrix.md`**.

**Engineering sweep:** **`npm run audit:matrix-greps`** re-runs the matrix’s baseline searches via [`scripts/audit-matrix-greps.sh`](../../scripts/audit-matrix-greps.sh): **ripgrep** when available, otherwise **find** + **grep**. Update the markdown inventory when materially new routers or REST integration paths appear—see matrix section *REST routes, cron jobs, and workers*.

## Review

Interpret rows using:

- **`entityType`** — domain label for the touched record or concept (instrumentation-defined string).
- **`action`** — verb or lifecycle step (instrumentation-defined string).
- **`payload`** — structured JSON capturing before/after or summary facts as implemented for that mutation.

**PII caution:** payloads and related UI exports may mirror free-text fields, names, or operational detail from the underlying entity. Prefer least-privilege roles, secure export handling, and counsel-aligned handling of personal data.

For **attachments and blob / evidence storage responsibilities** (encryption, tenancy, backups, subprocessors), see **`COMPLIANCE.md`** — *Attachment and blob storage* (application enforces RBAC and transactional audit metadata, not object-store posture).

## Retention lifecycle

Automated expiry and **`legal_hold`** / anonymization behaviours for in-scope programme rows tie to **`data_retention_policy`** defaults and cron processing; implementation lives under **`src/server/services/dataRetention.ts`** and **`src/app/api/cron/data-retention/route.ts`**. For operator-facing summaries, see **`COMPLIANCE.md`** (*Retention / anonymization*). Prefer those sources over copying step-by-step procedures here so this runbook does not drift.

## Integration with staging UAT

Business sign-off workflows should explicitly exercise transactional audit visibility where instrumented—for example **`/dashboard/audit-trail`** and expectations after saves on **`/dashboard/incidents`**. See **`docs/qa/staging-uat-desk-to-field.md`** (*Audit trail (console)* and related rows).
