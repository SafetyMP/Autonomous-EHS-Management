import type { OperationalWebhookEventId } from "./eventTypes";

export type NotificationChannel = "json" | "slack" | "teams";

export type OperationalWebhookEnvelope = {
  specVersion: number;
  eventType: OperationalWebhookEventId | "operational_webhook.test";
  occurredAt: string;
  organizationId: string;
  data: Record<string, unknown>;
};

const EVENT_TITLES: Record<string, string> = {
  "observation.follow_up_escalated": "Observation follow-up overdue",
  "approval.step_escalated": "Approval step overdue",
  "program.credential_batch_expired": "Contractor credentials expired",
  "integration.processing_failed": "HRIS / integration processing failed",
  "operational_webhook.test": "EHS operational webhook test",
};

export function operationalWebhookEventTitle(eventType: string): string {
  return EVENT_TITLES[eventType] ?? eventType;
}

/** Infer Slack / Teams formatting from webhook URL host. */
export function detectNotificationChannel(targetUrl: string): NotificationChannel {
  try {
    const hostname = new URL(targetUrl).hostname.toLowerCase();
    const matchesDomain = (domain: string) =>
      hostname === domain || hostname.endsWith(`.${domain}`);

    if (matchesDomain("hooks.slack.com") || matchesDomain("slack.com")) return "slack";
    if (
      matchesDomain("webhook.office.com") ||
      matchesDomain("outlook.office.com") ||
      matchesDomain("office365.com")
    ) {
      return "teams";
    }
  } catch {
    /* invalid URL → json */
  }
  return "json";
}

function summarizeData(data: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue;
    const rendered =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    parts.push(`${key}: ${rendered.slice(0, 200)}`);
  }
  return parts.length ? parts.join("\n") : "No additional details.";
}

export function formatOperationalWebhookBody(
  channel: NotificationChannel,
  envelope: OperationalWebhookEnvelope,
): { body: string; contentType: string } {
  const title = operationalWebhookEventTitle(envelope.eventType);
  const summary = summarizeData(envelope.data);

  if (channel === "slack") {
    const text = `[EHS] ${title}\nOrg: ${envelope.organizationId}\n${summary}`;
    return {
      contentType: "application/json",
      body: JSON.stringify({
        text,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `[EHS] ${title}`, emoji: true },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Organization:* \`${envelope.organizationId}\`\n*When:* ${envelope.occurredAt}`,
            },
          },
          { type: "section", text: { type: "mrkdwn", text: `\`\`\`${summary.slice(0, 2800)}\`\`\`` } },
        ],
      }),
    };
  }

  if (channel === "teams") {
    return {
      contentType: "application/json",
      body: JSON.stringify({
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        summary: title,
        themeColor: "007A33",
        title: `[EHS] ${title}`,
        sections: [
          {
            activityTitle: envelope.occurredAt,
            facts: [
              { name: "Organization", value: envelope.organizationId },
              { name: "Event", value: envelope.eventType },
            ],
            text: summary.slice(0, 3000),
          },
        ],
      }),
    };
  }

  return {
    contentType: "application/json",
    body: JSON.stringify(envelope),
  };
}

export const OPERATIONAL_WEBHOOK_EVENT_LABELS: Record<
  OperationalWebhookEventId,
  { label: string; hint: string }
> = {
  "observation.follow_up_escalated": {
    label: "Observation SLA breach",
    hint: "Notify supervisors when observation follow-up is overdue.",
  },
  "approval.step_escalated": {
    label: "Approval step overdue",
    hint: "CAPA, work permit, or environmental permit approval chains.",
  },
  "program.credential_batch_expired": {
    label: "Contractor credentials expired",
    hint: "Daily cron marks credentials past valid-to as expired.",
  },
  "integration.processing_failed": {
    label: "Integration processing failed",
    hint: "HRIS/LMS inbound could not apply — check /dashboard/integrations.",
  },
};
