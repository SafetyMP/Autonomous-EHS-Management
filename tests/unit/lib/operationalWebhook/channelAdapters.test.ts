import { describe, expect, it } from "vitest";
import {
  detectNotificationChannel,
  formatOperationalWebhookBody,
  operationalWebhookEventTitle,
} from "@/lib/operationalWebhook/channelAdapters";

describe("detectNotificationChannel", () => {
  it("detects Slack URLs", () => {
    expect(detectNotificationChannel("https://hooks.slack.com/services/T/B/x")).toBe("slack");
  });

  it("detects Teams connector URLs", () => {
    expect(
      detectNotificationChannel(
        "https://outlook.office.com/webhook/abc@def/IncomingWebhook/xyz",
      ),
    ).toBe("teams");
  });

  it("falls back to json for generic HTTPS", () => {
    expect(detectNotificationChannel("https://example.com/hook")).toBe("json");
  });
});

describe("formatOperationalWebhookBody", () => {
  const envelope = {
    specVersion: 1,
    eventType: "integration.processing_failed" as const,
    occurredAt: "2026-05-24T12:00:00.000Z",
    organizationId: "00000000-0000-4000-8000-000000000001",
    data: { integrationEventId: "evt-1" },
  };

  it("wraps Slack block payload", () => {
    const { body, contentType } = formatOperationalWebhookBody("slack", envelope);
    expect(contentType).toBe("application/json");
    const parsed = JSON.parse(body) as { text: string; blocks: unknown[] };
    expect(parsed.text).toContain("HRIS");
    expect(parsed.blocks.length).toBeGreaterThan(0);
  });

  it("wraps Teams MessageCard payload", () => {
    const { body } = formatOperationalWebhookBody("teams", envelope);
    const parsed = JSON.parse(body) as { "@type": string; title: string };
    expect(parsed["@type"]).toBe("MessageCard");
    expect(parsed.title).toContain("EHS");
  });

  it("passes through raw JSON envelope", () => {
    const { body } = formatOperationalWebhookBody("json", envelope);
    expect(JSON.parse(body)).toEqual(envelope);
  });
});

describe("operationalWebhookEventTitle", () => {
  it("maps known event ids", () => {
    expect(operationalWebhookEventTitle("approval.step_escalated")).toBe(
      "Approval step overdue",
    );
  });
});
