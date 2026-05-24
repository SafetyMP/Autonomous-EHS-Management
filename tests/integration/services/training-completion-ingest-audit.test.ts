import { describe, expect, it, vi, beforeEach } from "vitest";
import * as audit from "@/server/services/audit";
import { integrationEvent } from "@/server/db/schema";
import { persistTrainingCompletionEvent } from "@/server/services/trainingCompletionIngest";

const orgId = "00000000-0000-4000-8000-000000000001";
const eventId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("persistTrainingCompletionEvent", () => {
  it("writes audit_log on successful insert in the same transaction executor", async () => {
    const spy = vi.spyOn(audit, "writeAuditLog").mockResolvedValue(undefined);

    const tx = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          returning: () => Promise.resolve([{ id: eventId }]),
        }),
      }),
    };

    const db = {
      transaction: async <T>(fn: (inner: typeof tx) => Promise<T>) => fn(tx),
    };

    await persistTrainingCompletionEvent(
      db as unknown as Parameters<typeof persistTrainingCompletionEvent>[0],
      {
        organizationId: orgId,
        externalWorkerId: "vendor-worker-1",
        courseCode: "HSE-101",
        completedAt: new Date("2026-01-15T12:00:00.000Z"),
        issuer: "lms-test",
      },
      null,
    );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        organizationId: orgId,
        actorUserId: null,
        action: "integration.ingest_training_completion",
        entityType: "integration_event",
        entityId: eventId,
        payload: expect.objectContaining({
          eventType: "training_completion",
          courseCode: "HSE-101",
          userMatched: false,
        }),
      }),
    );

    spy.mockRestore();
  });

  it("passes integrationEvent table into insert chain (contract with Drizzle)", async () => {
    const insertSpy = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: eventId }]),
      }),
    });

    const tx = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
      insert: insertSpy,
    };
    const db = {
      transaction: async <T>(fn: (inner: typeof tx) => Promise<T>) => fn(tx),
    };

    vi.spyOn(audit, "writeAuditLog").mockResolvedValue(undefined);

    await persistTrainingCompletionEvent(
      db as unknown as Parameters<typeof persistTrainingCompletionEvent>[0],
      {
        organizationId: orgId,
        externalWorkerId: "w",
        courseCode: "C1",
        completedAt: new Date(),
        issuer: "issuer",
      },
      "actor-uuid",
    );

    expect(insertSpy).toHaveBeenCalledWith(integrationEvent);
  });
});
