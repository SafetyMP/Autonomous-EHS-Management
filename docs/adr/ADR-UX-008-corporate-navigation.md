# ADR-UX-008: Corporate navigation and overview

Date: 2026-11-14
Status: Implemented locally and independently reviewed; see [verification report](../qa/corporate-redesign/verification.md). Authorized by the user in the redesign chat.

## Scope

Make the existing EHS console easier for corporate users to navigate. The user approved shared navigation, corporate overview, and the incident-to-corrective-action journey, with existing workflows and permissions preserved and independent implementation review required.

This revision supersedes ADR-UX-001's navigation labels/grouping and ADR-UX-006's prohibition on a concise, visible corporate summary. Historical evidence and approval records remain unchanged. This is an interface revision, not a module maturity promotion or evidence of improved customer engagement.

## Acceptance

- Six consistently visible navigation groups: Overview; Actions & approvals; Incidents & observations; Audits & inspections; Programs & risks; Reports & evidence. Administration stays separate. All existing destinations remain available with unchanged URLs and existing field administration filtering.
- Organization context appears in shared chrome. A saved selection must match current membership, and switching organization clears prior record form state. No cross-organization aggregation is introduced.
- Active navigation identifies the most specific matching route; breadcrumbs and navigation search help users find and return to a destination. Mobile menu supports keyboard focus, Escape, and focus restoration.
- Corporate overview shows four concise permission-scoped measures and actionable attention items. Unavailable or failed data never implies a zero count or completed work. The full KPI catalogue stays disclosed; one H1, no more than one primary queue action, three emphasized queue rows, and the existing 12-control main-content density budget remain.
- Incident detail clearly connects to its actual linked corrective actions. A corrective action provides a return to its source incident. Incident list filters survive the round trip. Saved status, loading, empty, permission-denied and error states remain distinguishable.
- No server procedures, schema, RBAC keys, regulated state transitions, AI authority, or maturity claims change.

## Verification

Run npm run verify; audit matrix and threat-model checks; module-maturity coverage; authenticated workflow/navigation smoke and accessibility/density checks where the local environment supports them. Obtain independent review of the final diff, address material findings, and record any unverified behavior. Browser evidence must show loaded pages, not loading placeholders.

Customer task-completion and engagement improvements remain unmeasured until evaluated with representative users.
