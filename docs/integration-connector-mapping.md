# Integration connector mappings (tenant field hints)

`integration_connector_mapping` stores operator-owned JSON describing **how upstream LMS / HRIS fields map onto Autonomous EHS inbound envelopes**. It **does not** change server-side envelope validation—`/api/integration/inbound` still requires the canonical JSON shape decoded in [`src/lib/integration/inboundEnvelope.ts`](../src/lib/integration/inboundEnvelope.ts).

## Supported connector keys (`connector_key`)

| Key | Use |
|-----|-----|
| `lms_inbound` | Training completion payloads (`training_completion`). |
| `hris_inbound` | Worker membership payloads (`hris_membership_sync`). |

## Procedures

| Procedure | Permission | Notes |
|-----------|-------------|-------|
| `integration.listConnectorMappings` | `integration:read` | Returns rows excluding cross-tenant rows. |
| `integration.upsertConnectorMapping` | `integration:write` | Inserts/replaces mapping JSON (< 96 keys enforced). Writes `audit_log` (`integration.connector_mapping.upsert`). |

## Recommended JSON shape

This is illustrative—your integration team chooses keys that match ERP/LMS contract documents:

```json
{
  "externalWorkerIdField": "employeeNumber",
  "courseCodeField": "completion.courseCode",
  "notesForOperators": "Map Workday learner id → externalWorkerId"
}
```

Version the contract with **`schema_version`** on each row so outbound warehouse tooling can correlate exports with mapping semantics.
