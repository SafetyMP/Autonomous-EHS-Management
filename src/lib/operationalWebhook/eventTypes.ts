export const OPERATIONAL_WEBHOOK_EVENT_IDS = [
  "observation.follow_up_escalated",
  "approval.step_escalated",
  "program.credential_batch_expired",
  "integration.processing_failed",
] as const;

export type OperationalWebhookEventId = (typeof OPERATIONAL_WEBHOOK_EVENT_IDS)[number];

export function assertOperationalWebhookEventId(
  v: string | undefined,
): v is OperationalWebhookEventId {
  return (
    !!v &&
    (OPERATIONAL_WEBHOOK_EVENT_IDS as readonly string[]).includes(v)
  );
}
