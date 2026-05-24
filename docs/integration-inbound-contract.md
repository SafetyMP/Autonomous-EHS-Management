# Integration inbound contract

Stable HTTP contract for **`POST /api/integration/inbound`** — for iPaaS partners, systems integrators, and forks that wire LMS/HRIS without reading tRPC internals.

**Implementation source of truth:** [`src/lib/integration/inboundEnvelope.ts`](../src/lib/integration/inboundEnvelope.ts) (Zod schemas). This document describes **behavior and versioning policy**; when in doubt, the Zod definitions win.

**Related:** [integration-connector-mapping.md](./integration-connector-mapping.md), [JOB_QUEUE.md](./JOB_QUEUE.md), [procurement-integrations-appendix.md](./procurement-integrations-appendix.md).

---

## Endpoint

| Item | Value |
|------|--------|
| Method | `POST` |
| Path | `/api/integration/inbound` |
| Auth | `Authorization: Bearer <INTEGRATION_INBOUND_SECRET>` |
| Content-Type | `application/json` |
| Config | `INTEGRATION_INBOUND_SECRET` must be set or the route returns **503** |

---

## Contract version

| Field | Policy |
|-------|--------|
| **`contractVersion`** | **Optional** on inbound JSON. Omit or set to **`"1"`** for the shapes documented below. Reserved for future breaking changes. |
| **Semver (documentation)** | **Major** = breaking JSON shape or HTTP semantics for a given `kind`. **Minor** = backward-compatible optional fields. **Patch** = docs/clarifications only. |
| **Current major** | **`1`** — all `kind` values below. |
| **Fork / SI guidance** | Pin your middleware to a **git tag or release** of this repo and record the tag in your connector mapping `schema_version` (see [connector mapping](./integration-connector-mapping.md)). |

Breaking changes (when they occur) will:

1. Add a new major documented here and bump default validation only after a deprecation window, **or**
2. Introduce a new `kind` suffix / parallel route with explicit migration notes in [ROADMAP.md](../ROADMAP.md).

**Non-breaking additions** (minor): new **optional** fields on existing `kind` objects; new `kind` discriminator values with their own schema.

---

## Idempotency

Optional **`idempotencyKey`** (string, 1–256 chars) on any payload:

- Stored in `integration_inbound_idempotency` keyed by `(organizationId, idempotencyKey)`.
- Replays with the same key return the **cached HTTP status and JSON body** without reprocessing.
- For `hris_membership_sync` with `PG_BOSS_ENABLED=true`, the key also drives pg-boss **singletonKey** while a job is in flight.

Send stable keys from your iPaaS (e.g. vendor event id + organization id).

---

## Payload kinds (major version 1)

All payloads require **`organizationId`** (UUID) unless noted. Every payload should include **`kind`** except legacy LMS bodies (see below).

### `training_completion`

LMS course completion ingest.

```json
{
  "kind": "training_completion",
  "organizationId": "550e8400-e29b-41d4-a716-446655440000",
  "externalWorkerId": "WD-12345",
  "courseCode": "HAZCOM-2025",
  "completedAt": "2025-11-15T14:30:00.000Z",
  "issuer": "workday-learning",
  "idempotencyKey": "optional-vendor-event-id"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `externalWorkerId` | yes | Opaque vendor id (not necessarily UUID) |
| `courseCode` | yes | Max 128 chars |
| `completedAt` | yes | ISO 8601 date/time (coerced) |
| `issuer` | yes | Max 128 chars |

**Legacy:** bodies **without** `kind` but with `externalWorkerId` are parsed as `training_completion` for backward compatibility.

**Success (200):**

```json
{
  "ok": true,
  "id": "<integration_event uuid>",
  "processingStatus": "applied",
  "trainingRecordId": "<uuid>"
}
```

---

### `hris_membership_sync`

Employee / worker membership joiner, updater, or termination signal.

```json
{
  "kind": "hris_membership_sync",
  "organizationId": "550e8400-e29b-41d4-a716-446655440000",
  "workerEmail": "alex.worker@example.com",
  "siteId": null,
  "externalWorkerId": "WD-12345",
  "department": "Operations",
  "jobTitle": "Technician",
  "managerEmail": "supervisor@example.com",
  "costCenter": "CC-100",
  "employmentStatus": "active",
  "idempotencyKey": "optional-vendor-event-id"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `workerEmail` | yes | Primary join key for new users |
| `siteId` | no | UUID or null |
| `externalWorkerId` | no | Max 128 chars |
| `department`, `jobTitle`, `costCenter` | no | Max lengths per schema |
| `managerEmail` | no | Email |
| `employmentStatus` | no | `active` \| `terminated` \| `leave` |

**Async (202)** when `PG_BOSS_ENABLED=true` on the server **and** a worker is running:

```json
{ "ok": true, "queued": true }
```

Worker completion writes idempotency cache with final **200** or **422** body (see [JOB_QUEUE.md](./JOB_QUEUE.md)).

**Sync success (200):**

```json
{
  "ok": true,
  "id": "<integration_event uuid>",
  "processingStatus": "applied"
}
```

**Processing failure (422):**

```json
{
  "ok": false,
  "id": "<integration_event uuid>",
  "error": "processing_failed"
}
```

---

### `hris_contractor_sync`

Contractor / visitor / temporary worker party sync.

```json
{
  "kind": "hris_contractor_sync",
  "organizationId": "550e8400-e29b-41d4-a716-446655440000",
  "externalWorkerId": "CTR-9876",
  "companyName": "Acme Industrial Services",
  "contactName": "Jane Contractor",
  "contactEmail": "jane@acme-industrial.example",
  "siteId": null,
  "partyType": "contractor",
  "hrisSource": "workday",
  "employmentStatus": "active",
  "idempotencyKey": "optional-vendor-event-id"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `externalWorkerId` | yes | Max 128 chars |
| `companyName` | yes | Max 512 chars |
| `partyType` | no | Default `contractor`; also `visitor`, `temporary_worker` |
| `contactName`, `contactEmail`, `siteId`, `hrisSource`, `employmentStatus` | no | See schema |

**Success (200):** `{ "ok": true, "id": "...", "processingStatus": "applied" }`  
**Failure (422):** `{ "ok": false, "id": "...", "error": "..." }`

---

### `roster_snapshot`

Bulk roster compare for drift detection (not a full HRIS replace).

```json
{
  "kind": "roster_snapshot",
  "organizationId": "550e8400-e29b-41d4-a716-446655440000",
  "source": "workday-nightly",
  "workers": [
    { "workerEmail": "alex.worker@example.com", "externalWorkerId": "WD-12345" }
  ],
  "idempotencyKey": "optional-batch-id"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `workers` | yes | 1–10,000 entries |
| `workerEmail` | yes per worker | Email |
| `externalWorkerId` | no per worker | Max 128 chars |
| `source` | no | Max 64 chars |

**Success (200):**

```json
{
  "ok": true,
  "id": "<integration_event uuid>",
  "processingStatus": "applied",
  "driftCount": 3
}
```

---

## Error responses

| HTTP | Body | When |
|------|------|------|
| **401** | `{ "error": "Unauthorized" }` | Missing/wrong bearer |
| **503** | `{ "error": "Integration inbound is not configured." }` | Secret not set |
| **400** | `{ "error": "Validation failed", "issues": { ... } }` | Zod validation |
| **400** | `{ "error": "Invalid JSON" }` | Malformed body |
| **400** | `{ "error": "Unsupported kind" }` | Unknown `kind` |
| **500** | `{ "error": "Persist failed" }` | Server error |

---

## Connector mapping (operator hints)

`integration_connector_mapping` stores **your** field-name hints (`lms_inbound`, `hris_inbound`). It does **not** alter validation—middleware must still emit the canonical JSON above.

Recommended row metadata:

```json
{
  "schema_version": "1.0",
  "inbound_contract_ref": "docs/integration-inbound-contract.md",
  "git_ref": "v2026.05.0"
}
```

Procedures: `integration.listConnectorMappings`, `integration.upsertConnectorMapping` ([integration-connector-mapping.md](./integration-connector-mapping.md)).

---

## Changelog (contract major 1)

| Date | Change | Semver |
|------|--------|--------|
| 2026-05 | Initial published contract (`training_completion`, `hris_membership_sync`, `hris_contractor_sync`, `roster_snapshot`) | 1.0.0 |

Update this table when optional fields or new kinds ship.
