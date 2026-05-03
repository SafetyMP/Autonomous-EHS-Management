# Operational webhooks

Org admins may register **HTTPS POST** receivers (`operational_webhook_endpoint`) so supervisory systems can react without polling the dashboards.

## Who can configure

- **Mutation API:** `organization.createOperationalWebhook`, `organization.updateOperationalWebhook`, `organization.deleteOperationalWebhook`.
- **Permission:** requires `org:admin` membership for the tenant.
- **Read panel:** `organization.operationalWebhooksPanel` — returns `allowed: false` (not an auth error) for non-admins so read-only dashboards can degrade gracefully.

## When deliveries fire

Configured endpoints receive JSON when subscribed to canonical event identifiers:

| Event id | Trigger |
|---------|---------|
| `observation.follow_up_escalated` | Cron job [`GET /api/cron/reminders`](../src/app/api/cron/reminders/route.ts) inserted a row into `escalation_event` for an overdue observation follow-up. |
| `approval.step_escalated` | Same cron inserted a new `escalation_event` for an **overdue pending approval step** (CAPA plan, work permit, or environmental permit approval chains — `approval_request` + `approval_step`). |
| `program.credential_batch_expired` | Same cron updated one or more `external_party_credential` rows to `expired` for the org (`credentialExpiry`); one delivery per affected org per run when any rows changed. |
| `integration.processing_failed` | HRIS inbound processing failed (`processHrisMembershipSyncInbound` persisted `processingStatus = failed`). |

Subscriptions are explicit per endpoint (`subscribed_events`).

## Payload envelope

```json
{
  "specVersion": 1,
  "eventType": "observation.follow_up_escalated",
  "occurredAt": "2026-05-03T12:00:00.000Z",
  "organizationId": "…uuid…",
  "data": {}
}
```

- **Observation escalate `data`:** `escalationEventId`, `observationId`, `message`.
- **Approval step escalate `data`:** `escalationEventId`, `approvalStepId`, `approvalRequestId`, `requestEntityType`, `requestEntityId`, `stepOrder`, `message`.
- **Credential batch expiry `data`:** `expiredCount`, `credentialIdsSample` (short list of ids updated this run).
- **Integration failure `data`:** `integrationEventId`, `sourceEventType` (e.g. `hris_membership_sync`), `processingErrorPreview`.

## Signature verification

Optional shared secret configured on create/update. Requests include **`X-EHS-Signature`** as `sha256=<hex_hmac>` computed over **the exact UTF-8 JSON bytes** of the envelope using **HMAC-SHA256**.

Use your platform’s verifier; this repo publishes `verifyOperationalWebhookSignature` in [`src/server/services/operationalWebhookDispatch.ts`](../src/server/services/operationalWebhookDispatch.ts) for reference tests.
