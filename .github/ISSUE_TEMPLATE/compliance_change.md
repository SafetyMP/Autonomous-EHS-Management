---
name: Compliance / data governance change
about: Regulated workflows, retention, RAG safety, OSHA/Tier II, COMPLIANCE.md
title: "[compliance]: "
labels: ""
assignees: ""
---

## Summary & risk

Briefly describe the change and regulated surface area (`COMPLIANCE.md`, `audit_log`, RAG ingestion, OSHA sidecar schema, Tier II snapshots, retention policies, incident/CAPA lifecycle, etc.).

## Legal / counsel

- Counsel ticket or disposition (reference only):

## Product controls

Describe human-in-the-loop requirements (no silent auto-close of investigations, CAPA verification, classification changes).

## Migration & audit

Will this require Drizzle migrations, backfills (`redactExistingSource`-style paths), seed updates, or new permissions in `scripts/seed.ts`?

## Testing evidence plan

Which commands will gate merge (e.g. `npm run verify`, targeted Vitest suites, smoke E2E)?

---

**Mandatory links**

- [ ] Compliance doc or policy reference: **`COMPLIANCE.md`** § (fill in)
- [ ] Companion engineering issue or ADR:

**Checklist**

- [ ] I followed `.cursor/rules/ehs-ims-conventions.mdc` for schema/RBAC boundaries.
- [ ] RBAC updates include `permission` migration / seed where applicable.
