import { describe, expect, it } from "vitest";
import { reprocessFailedIntegrationEvent } from "@/server/services/integrationInboundDispatch";
import { reapplyTrainingCompletionFromStoredPayload } from "@/server/services/trainingCompletionIngest";

describe("reprocessFailedIntegrationEvent", () => {
  it("rejects roster_snapshot reprocess with guidance", async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: "00000000-0000-4000-8000-000000000099",
                organizationId: "00000000-0000-4000-8000-000000000001",
                eventType: "roster_snapshot",
                processingStatus: "failed",
                payload: { workerCount: 3 },
              },
            ],
          }),
        }),
      }),
    };

    const result = await reprocessFailedIntegrationEvent(db as never, {
      organizationId: "00000000-0000-4000-8000-000000000001",
      eventId: "00000000-0000-4000-8000-000000000099",
      actorUserId: "user-1",
    });

    expect(result).toEqual({
      ok: false,
      message:
        "Roster snapshot reprocess is not supported from stored events; re-post the roster_snapshot batch to /api/integration/inbound.",
    });
  });
});

describe("reapplyTrainingCompletionFromStoredPayload", () => {
  it("rejects redacted externalWorkerId payloads", async () => {
    await expect(
      reapplyTrainingCompletionFromStoredPayload(
        {} as never,
        "00000000-0000-4000-8000-000000000001",
        "event-1",
        {
          externalWorkerId: "[redacted:12chars]",
          courseCode: "OSHA-10",
          completedAt: "2026-05-01T00:00:00.000Z",
          issuer: "lms",
        },
        "user-1",
      ),
    ).rejects.toThrow(/redacted/);
  });
});
