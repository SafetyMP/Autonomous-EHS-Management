---
name: Compliance / data governance change
about: Regulated workflows, retention, RAG safety, OSHA/Tier II, COMPLIANCE.md
title: "[compliance]: "
labels: ""
assignees: ""
---

## Summary & risk

Briefly describe the change and regulated surface area (`COMPLIANCE.md`, `audit_log`, RAG ingestion, OSHA sidecar schema, Tier II snapshots, retention policies, incident/CAPA lifecycle, etc.).

Describe whether the change affects the full application, its deployment, or explanatory walkthrough content. A static example must not imply a real approval, filing, or compliance determination. Use synthetic examples and omit sensitive records.

## Legal / counsel

- Applicable jurisdiction or organizational policy:
- Counsel ticket or disposition, if applicable (reference only; no confidential advice):

## Product controls

Describe human-in-the-loop requirements (no silent auto-close of investigations, CAPA verification, classification changes).

## Migration & audit

Will this require Drizzle migrations, backfills (`redactExistingSource`-style paths), seed updates, or new permissions in `scripts/seed.ts`?

## Permissions and authority

Which roles, organization boundaries, or server procedures are affected? Preserve authenticated access, server-side permission checks, and explicit human review.

## Testing evidence plan

Which commands will gate merge (e.g. `npm run verify`, targeted Vitest suites, smoke E2E)?

---

**Mandatory links**

- [ ] Compliance doc or policy reference: **`COMPLIANCE.md`** § (fill in)
- [ ] Companion engineering issue or ADR:

**Checklist**

- [ ] I followed `.cursor/rules/ehs-ims-conventions.mdc` for schema/RBAC boundaries.
- [ ] RBAC updates include `permission` migration / seed where applicable.
