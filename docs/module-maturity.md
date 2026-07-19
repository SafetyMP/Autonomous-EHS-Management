# Module maturity tiers

Single sales/engineering/procurement alignment surface for what is **Core**
(fully operable), **Connected** (UI + cross-links), **Plumbing** (API/event/
scaffold only), or **Gated** (behind explicit banner / no nav). Enforced by
[`scripts/module-maturity-check.mjs`](../scripts/module-maturity-check.mjs) —
every routed module in
[`src/lib/dashboard-nav-links.ts`](../src/lib/dashboard-nav-links.ts) must
have exactly one row below.

Governing ADR: [ADR-S-001](./adr/ADR-S-001-honesty-promotion.md).
Cross-references: [architecture-map.md](./architecture-map.md),
[procurement-readiness.md](./procurement-readiness.md) §12,
[regulatory-posture-boundary.md](./regulatory-posture-boundary.md),
[`ROADMAP.md`](../ROADMAP.md) "Shipped recently" (July 2026 regulatory pack),
[regulatory/](./regulatory/), and PortCo tier mapping in
[portco-module-value-assessment.md](./portco-module-value-assessment.md) /
[qa/portco-tier1-pilot-scope.md](./qa/portco-tier1-pilot-scope.md).

**Not legal advice.** Regulatory-posture columns follow
[`COMPLIANCE.md`](../COMPLIANCE.md).

---

## Tier glossary

| Tier | Meaning | Marketing rule |
|------|---------|----------------|
| **Core** | Full workflow, encoded transitions or explicit register semantics, RBAC, `audit_log` matrix entry, UAT coverage. | May appear in Core-spine marketing lists. |
| **Connected** | Dashboard UI, org-scoped RBAC, cross-links into the Core spine, may still carry maturity banner where scope is bounded. | Do **not** market as standalone switching cost. |
| **Plumbing** | Backend/event/scaffold that the UI exposes only with a maturity banner; no filing/agency claim. | **Never** listed as Core; procurement §12 lists the residual gap. |
| **Gated** | No nav (or explicit banner) and behind a kill switch or counsel gate. | **Never** listed as Core; counsel exception required to elevate. |

Promotion between tiers must satisfy the six-artifact packet in
[`lifecycle/promotion-packet.md`](./lifecycle/promotion-packet.md). Plumbing →
Core needs a counsel exception ID.

---

## Per-module tier map (routed dashboard modules)

| Route | Label | Tier | Stage | Banner in UI? | Notes / residual gaps |
|-------|-------|------|-------|---------------|-----------------------|
| `/dashboard` | Command center | Core | S3 | No | Personal work queue over Core spine (incident/CAPA/approvals). Stage S4 (production-hardened ops) deferred while D-008 monitoring owner / scrape digests remain open (R-004 / R-011). |
| `/dashboard/tasks` | Tasks & reviews | Core | S3 | No | `audit_log` on task lifecycle; smoke via command-center suite. |
| `/dashboard/approvals` | Approvals | Core | S3 | No | Decide-path smoke required for Core positioning (R-007). |
| `/dashboard/incidents` | Incidents | Core | S3 | No | Encoded transitions + `writeAuditLog`; sensitive-read gate via `incident:read_sensitive`. Not an OSHA 300/301/300A SoR ([COMPLIANCE.md](../COMPLIANCE.md)). |
| `/dashboard/observations` | Observations | Core | S3 | No | Program record; not OSHA injury log. PII in `details` — see COMPLIANCE.md. |
| `/dashboard/inspections` | Inspections | Core | S3 | No | Encoded transitions + audit trail. |
| `/dashboard/permits` | Work permits (PTW) | Connected | S2 | No | Field authorization only. Smoke coverage pending — remains Connected until Core-spine smoke exists (R-007). Not an environmental regulatory permit. |
| `/dashboard/environmental-permits` | Regulatory env permits | Connected | S2 | Optional (register scope) | **Program register only** (metadata, conditions, renewals); **not** agency filing (R-005, [regulatory-posture-boundary.md](./regulatory-posture-boundary.md)). |
| `/dashboard/capa` | CAPA register | Core | S3 | No | Register + detail + source traceability + approval chain. |
| `/dashboard/planning` | Planning hub | Connected | S2 | No | Cross-links into planning/programme registers. |
| `/dashboard/heat-program` | Heat NEP program aid | Connected | S2 | Yes | Appendix I program aid — **not** a heat-standard compliance determination (R-005). |
| `/dashboard/risk-assessments` | Risk assessments | Connected | S2 | Yes | Governed register + optional steps; not bowtie/LOPA replacement. |
| `/dashboard/environment` | Environment | Connected | S2 | No | Environmental monitoring cross-links. |
| `/dashboard/chemicals` | Chemical inventory | Plumbing | S1 | **Yes** | HCS 2024 / EPCRA 2027 hazard fields for **programme management**. **Not** EPA / Tier II submission (R-005). Promotion to Core blocked pending decision D-005. |
| `/dashboard/audits` | Internal audits | Connected | S2 | No | ISO internal audit programme; distinct from transactional `audit_log`. |
| `/dashboard/assurance` | Assurance hub | Connected | S2 | No | Rollup across audit programme + management review. |
| `/dashboard/management-review` | Mgmt review | Connected | S2 | No | ISO management-review inputs/outputs. |
| `/dashboard/documents` | Documents | Core | S3 | No | Documented information register; audit trail on lifecycle. |
| `/dashboard/rag` | Knowledge corpus | Connected | S2 | No | Governed retrieval with `RAG_READ` / `rag:ingest` gates; ingest redaction on by default (R-012). |
| `/dashboard/audit-trail` | Audit trail | Core | S3 | No | Transactional `audit_log` list (partial coverage acknowledged — see [mutation-auditability-matrix.md](./qa/mutation-auditability-matrix.md)). |
| `/dashboard/retention` | Retention | Connected | S2 | No | Policy surfaces; `data_retention_policy` cron classes documented in [COMPLIANCE.md](../COMPLIANCE.md). |
| `/dashboard/analytics` | Metrics | Connected | S2 | No | Roll-ups; TRIR-style analytics live under Incidence rates. |
| `/dashboard/analytics/incidence-rates` | Incidence rates | Connected | S2 | No | TRIR-style analytics from IMS recordables/hours — **not** an OSHA filing (R-005). |
| `/dashboard/training` | Training | Connected | S2 | No | LMS ingest → completion records; not a full LMS. |
| `/dashboard/contractors` | Contractors | Connected | S2 | No | `external_party` + credential renewal queue; not VMS / site access. |
| `/dashboard/program` | Program overview | Connected | S2 | No | Programme index / scope readout. |
| `/dashboard/emergency` | Emergency prep | Connected | S2 | No | Programme aids; drill + response links. |
| `/dashboard/moc` | Management of change | Connected | S2 | No | Register with ISO 14001:2026 Clause 6.3 planning fields (transition aid; not certification). |
| `/dashboard/import` | Import | Plumbing | S1 | Yes | Bulk import scaffolds; not a Core intake path. |
| `/dashboard/integrations` | Integrations | Connected | S2 | No | Inbound envelopes + webhooks + integration event log. Native Workday OAuth remains Plumbing (see below). |
| `/dashboard/privacy-requests` | Privacy | Plumbing | S1 | **Yes** | DSAR **intake + policy surfaces only** — **not** automated erasure/export (R-005, [DSAR_PROCESS.md](./DSAR_PROCESS.md)). |
| `/dashboard/context` | Organization context (ISO 4) | Connected | S2 | No | tRPC `context.*` ISO context-of-organization; distinct from REST Context Sync. |
| `/dashboard/workflow-catalog` | Workflow catalog | Connected | S2 | No | Encoded workflow inventory. |

**Coverage rule.** The count of rows above must equal the number of unique
`href` values in `DASHBOARD_NAV_SECTIONS`. `scripts/module-maturity-check.mjs`
enforces this on every commit that touches this doc or the nav module.

---

## Additional Plumbing / Gated surfaces (not in dashboard nav)

These do not have a top-level nav route but appear in procurement / RFP
material and must retain honest positioning.

| Surface | Tier | Stage | Notes |
|---------|------|-------|-------|
| OSHA agency filing scaffold (`oshaAgencyExportScaffold.ts`) | Plumbing | S0 | Sample CSV only — **not** filing-ready (R-005, decision D-001). |
| Native Workday OAuth | Plumbing | S0 | iPaaS playbooks ship; native connector deferred to counsel/D-003 window. |
| Customer MCP product surface | **Not shipped** | — | Context Sync REST is the governed alternative ([ADR 0001](./adr/0001-mcp-context-sync-strategy.md)); Cursor MCP remains internal tooling only. |

---

## Promotion process

1. Author the six lifecycle artifacts documented in
   [`lifecycle/promotion-packet.md`](./lifecycle/promotion-packet.md).
2. Update the tier row above **and** the matching row in
   [`procurement-readiness.md`](./procurement-readiness.md) §12. The
   module-maturity lint fails otherwise.
3. Plumbing → Core additionally requires a counsel exception ID
   (see promotion packet §5).
4. Never elevate a Plumbing/Gated surface to Core in marketing without
   completing step 1–3; the claim-lint script rejects `filing-ready` / `agency
   SoR` / `Tier2 Submit` / `erase everything` / `certification body` /
   `OSHA-ready` / `GDPR-compliant automated erasure` / `autonomous AI EHS`
   in buyer-facing docs regardless.
