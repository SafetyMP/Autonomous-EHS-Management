# Lifecycle promotion packet (S1 → S4)

Fail-closed checklist for advancing a dashboard module through the lifecycle
stages defined in R-004 of the corporate master spec. Governing decision:
[ADR-S-001](../adr/ADR-S-001-honesty-promotion.md). Not legal advice —
regulatory-claim expansion still requires counsel (`compliance` skill and
[`docs/regulatory-posture-boundary.md`](../regulatory-posture-boundary.md)).

## 1. Stages (canonical)

| Stage | Name | Criteria |
|-------|------|----------|
| **S0** | Scaffold | Schema / API / placeholder; may be Plumbing/Gated only. |
| **S1** | Connected | Dashboard route + nav, org-scoped RBAC, maturity banner if incomplete, cross-links into the Core spine. |
| **S2** | Operable Core | Explicit encoded transitions or register semantics, RBAC, audit matrix entry, demo seed. |
| **S3** | Pilot-ready | Desk-to-field / PortCo UAT sign-off (Pass or documented N/A), documented regulatory boundary. |
| **S4** | Production-hardened | Cron/ops runbooks, retention/hold alignment, CI smoke suite, no maturity banner, counsel-cleared claims only. |

## 2. Required artifacts per promotion (six required)

Every promotion request — S1→S2, S2→S3, S3→S4, and the special-case
Plumbing→Core jump — must supply the following six artifacts. Missing any
artifact is a **hard block** (fail-closed):

| # | Artifact | Owner | Evidence type |
|---|----------|-------|---------------|
| 1 | **Encoded transition / register spec** | Engineering | Test IDs in `tests/unit/**` or `tests/integration/**` exercising the workflow transitions (or explicit register-semantics tests for non-workflow modules). |
| 2 | **Permission matrix row** | Engineering + Security | Named `PERMISSIONS.*` keys and RBAC test that fails without them (e.g. `tests/unit/rbac-permissions.test.ts`). |
| 3 | **`audit_log` matrix row** | Engineering + Compliance | `docs/qa/mutation-auditability-matrix.md` row listing router file + `writeAuditLog` call (or documented one-hop callee). Grep-check via `npm run audit:matrix-greps`. |
| 4 | **UAT sign-off record** | Product + Customer / QA | Pass / N/A entry in [`qa/portco-uat-signoff-record.md`](../qa/portco-uat-signoff-record.md) or [`qa/staging-uat-desk-to-field.md`](../qa/staging-uat-desk-to-field.md). |
| 5 | **CI smoke ID** | Quality | Named Playwright `@smoke` test (spec path + `test()` title) verified locally via `./scripts/integration-e2e.sh`. |
| 6 | **Updated `module-maturity.md` row** | Product | The single-row edit that reclassifies the module tier + stage + banner. **Coupled** with a matching update to [`procurement-readiness.md`](../procurement-readiness.md) §12 in the same commit — enforced by `scripts/module-maturity-check.mjs`. |

If any of the six artifacts is missing at PR-review time, the PR must not
merge and the requester must either supply the missing artifact or withdraw
the promotion. Prose narrative substituting for one of the six is
**explicitly not accepted** (R-004 fail-closed rule).

## 3. Stage-specific extras

- **S2 → S3** — Attach a signed UAT record ID (Pass or documented N/A).
  Prose UAT is not sufficient.
- **S3 → S4** — Attach ops evidence (cron metrics / alerts for dependent jobs
  per [`docs/runbooks/`](../runbooks/)). Plumbing banner removal at this stage
  requires either (a) no filing/automation claim remains, or (b) counsel
  exception ID (§5).

## 4. Demotion

Demotion is **allowed at any time** when evidence fails or a downstream test
regresses. The PR that demotes the module updates `module-maturity.md` and
`procurement-readiness.md` §12 together and notes the failing artifact ID.
Demotion does not require a new counsel exception.

## 5. Plumbing → Core (special case, requires counsel exception)

Plumbing → Core is **banned by default** (R-005). To elevate:

1. Complete all six artifacts (§2).
2. Attach a **counsel exception ID** issued by the organisation's legal
   reviewer. Format: `CX-YYYY-<sequence>`. The counsel review must reference
   the specific R-005 phrase(s) being relaxed and the customer contract /
   DPA amendment that covers them.
3. Update [`docs/regulatory-posture-boundary.md`](../regulatory-posture-boundary.md)
   with the amended posture row.
4. Update [`procurement-readiness.md`](../procurement-readiness.md) §12 to
   reflect that the residual gap is resolved (or remains partially open with
   the counsel exception scoping the safe claim surface).

Without a valid counsel exception ID recorded in the PR body,
`scripts/module-maturity-check.mjs` rejects any row that combines a Plumbing/
Gated tier with an S4 lifecycle stage.

## 6. Filing / claim guardrails

Regardless of stage, the following R-005 phrases remain banned in
`README.md`, `docs/procurement-readiness.md`,
`docs/regulatory-posture-boundary.md`, and `COMPLIANCE.md` — enforced by
[`scripts/claim-lint.mjs`](../../scripts/claim-lint.mjs). Banned phrases can
appear in prohibited-column / negation-context tables when wrapped in a
`<!-- claim-lint:ignore-start -->` fence.

The list is authoritative in
[`docs/regulatory-posture-boundary.md`](../regulatory-posture-boundary.md)
"Acceptable vs prohibited contract phrases" and mirrored in the script
header. Adding new phrases means editing the doc, the script, and the unit
tests together.

## 7. Review flow (recommended sequence)

1. Author drafts the six artifacts on a feature branch.
2. Runs `./scripts/verify.sh` locally to ensure claim-lint and
   module-maturity-check pass.
3. Opens a promotion PR; reviewers verify each of the six artifacts.
4. Product signs off on the `module-maturity.md` tier change.
5. Compliance signs off on the audit-matrix + posture-boundary updates.
6. Ops signs off on the S3→S4 ops-evidence block (if applicable).
7. Counsel signs off on Plumbing→Core exception ID (if applicable).

Never mark `site_verify` / `operations` / `corporate_review` / `adversary`
gates passed from this document. The root orchestrator runs the gate
commands; operations excellence reviews the immutable evidence.
