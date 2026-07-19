# PortCo UAT sign-off record (Tier 1)

Business acceptance template for PortCo pilots. Combines **Tier 1 workflow UAT** from [staging-uat-desk-to-field.md](./staging-uat-desk-to-field.md) with **documented `audit_log` gaps** that must be acknowledged—not assumed complete—before calling a tenant production-ready.

**Status:** CONDITIONALLY APPROVED until EHS program leadership signs the block at the bottom.

**Engineering pre-check (run before staging UAT):**

```bash
npm run verify
npm run audit:matrix-greps
```

Last engineering grep pass: documented at commit time via `npm run audit:matrix-greps` (see [mutation-auditability-matrix.md](./mutation-auditability-matrix.md) Core-spine must-audit + residual RG-* gaps). CI `verify` fails closed on new unaudited tRPC `.mutation(` routers (ADR-S-003 / R-008).

**CI Core-spine smoke IDs (do not replace staging Pass/N/A):** `core-spine-capa-lifecycle`, `core-spine-approvals-decide`, `core-spine-audit-trail` under `tests/e2e/smoke/`.

---

## Tier 1 UAT checklist

Complete with staging roles mirroring production. **Pass / Fail / N/A** per row.

| Area | Route(s) | Verify | Result | Notes |
|------|----------|--------|--------|-------|
| **Command center** | `/dashboard` | Your work queue, KPIs, field vs desk layout | | |
| **Incidents** | `/dashboard/incidents`, `/new`, `/[id]` | Create → investigate → close; sensitive-read banner | | |
| **CAPA** | `/dashboard/capa`, `/[capaId]` | Create from incident/observation; approval → verified | | |
| **Approvals** | `/dashboard/approvals` | Approve/deny CAPA plan; queue accurate | | |
| **Observations** | `/dashboard/observations`, `/new` | Create; follow-up visible | | |
| **Contractors** | `/dashboard/contractors` | Credential + renewal queue; HRIS sync if wired | | |
| **Integrations** | `/dashboard/integrations` | SCIM/OIDC panel; event backlog; no secret leakage | | |
| **Tasks** | `/dashboard/tasks` | Pilot items appear in ranked queue | | |
| **Audit trail** | `/dashboard/audit-trail` | In-session Tier 1 actions appear (see gaps below) | | |

**Optional (if in pilot scope per [portco-tier1-pilot-scope.md](./portco-tier1-pilot-scope.md)):**

| Area | Route(s) | Result | Notes |
|------|----------|--------|-------|
| Inspections | `/dashboard/inspections` | | |
| Work permits (PTW) | `/dashboard/permits` | | |

**Integration JML (IT):** Complete [portco-staging-pilot.md](./portco-staging-pilot.md) Verify section before business sign-off.

---

## Documented `audit_log` gaps (PortCo diligence)

Per [COMPLIANCE.md](../../COMPLIANCE.md) residual risks and [mutation-auditability-matrix.md](./mutation-auditability-matrix.md): coverage is **high-signal where instrumented**, not universal.

### Tier 1 core — audited (spot-check in staging)

These routers instrument **`writeAuditLog`** on regulated mutations. Confirm entries appear after your in-session actions:

| Router | Mutations | Matrix status |
|--------|-----------|---------------|
| `incident` | create, update, updateStatus | **Y** |
| `capa` | create, updateStatus, assignOwner | **Y** |
| `approval` | submit*, decideRequest | **Y** (via delegated services) |
| `observation` | create, update, linkToCapa | **Y** |
| `integration` | enqueue, ingest, mapping, reprocess | **Y** |
| `externalParty` | credential CRUD | **Y** (abbreviated in matrix appendix) |

### Known gaps — acknowledge in sign-off

Aligned with residual gaps **RG-1…RG-6** in [mutation-auditability-matrix.md](./mutation-auditability-matrix.md):

| Gap | Impact | Mitigation for pilot |
|-----|--------|----------------------|
| **SCIM REST `/api/scim/v2/*` (RG-2)** | Provisioning audits may flow via membership/integration paths—not every SCIM PATCH field | Review `integration_event` backlog + membership state after bulk SCIM tests |
| **Queued inbound / worker timing (RG-1, RG-5)** | Audits may land on worker completion, not HTTP enqueue | Confirm apply path + DLQ/ops alerts |
| **Cron / SLA escalations (RG-3)** | `escalation_event` records exist; not all appear as user-initiated `audit_log` rows | Accept escalation_event + operational webhooks as ops evidence |
| **Tier 3 registers** (internal audit, MOC, emergency) | Out of Tier 1 pilot scope; thinner staging coverage | Defer UAT until Phase 2 |
| **Query-only surfaces** | `analytics`, `tasks.actionQueue` — no mutation audit expected | N/A |
| **PTW** | Connected — not Core; no Core promotion in ADR-S-003 | Optional pilot row only |

### Staging spot-check procedure

1. Perform one create/update/close for each Tier 1 entity type in a single session.
2. Open `/dashboard/audit-trail` with date filter = today.
3. For each action, record **Seen / Missing** in the table below.
4. Any **Missing** on Tier 1 core rows → **HOLD** until engineering triages (may be filter, permission, or instrumentation gap).

| Action performed | Audit trail seen? | Notes |
|------------------|-------------------|-------|
| Incident create | | |
| Incident status → closed | | |
| CAPA create | | |
| CAPA approval decided | | |
| Observation create | | |
| Contractor credential create/update | | |
| Integration test event / HRIS apply | | |
| `portcoIdentity` SCIM config update | | |
| `portcoIdentity` OIDC JIT rule create | | |

---

## Production-ready criteria

**APPROVED FOR PILOT** when:

- [ ] All Tier 1 UAT rows **Pass** or documented **N/A** with program owner approval
- [ ] Integration JML checklist complete ([portco-staging-pilot.md](./portco-staging-pilot.md))
- [ ] Audit spot-check: no **Missing** on incident, CAPA, approval, observation core paths
- [ ] Known gaps table reviewed with counsel / IT (SCIM mapping audit gap acknowledged)
- [ ] [regulatory-posture-boundary.md](../regulatory-posture-boundary.md) reviewed—program-of-record scope agreed
- [ ] Parallel reporting plan documented if legacy tools remain authoritative for OSHA agency records

**HOLD** when any Tier 1 workflow fails, integration JML fails, or critical audit path is missing without documented compensating control.

---

## Sign-off block

- **PortCo / tenant name:** __________________  
- **Pilot site(s):** __________________  
- **Program owner:** __________________  
- **Date:** __________________  
- **Result:** **APPROVED FOR PILOT** / **HOLD**  
- **Notes (audit gaps accepted, compensating controls):** __________________  
