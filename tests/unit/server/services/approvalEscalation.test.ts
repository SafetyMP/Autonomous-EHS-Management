import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordOverdueApprovalEscalations } from "@/server/services/approvalEscalation";

describe("recordOverdueApprovalEscalations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns newlyCreated when inserting overdue approval step escalation", async () => {
    const orgId = "00000000-0000-4000-8000-000000000001";
    const reqId = "11111111-1111-4111-8111-111111111111";
    const stepId = "22222222-2222-4222-8222-222222222222";
    const capaId = "33333333-3333-4333-8333-333333333333";
    const now = new Date("2026-05-10T12:00:00Z");
    const dueAt = new Date("2026-05-09T12:00:00Z");

    const openReq = {
      id: reqId,
      organizationId: orgId,
      entityType: "capa" as const,
      entityId: capaId,
      status: "open" as const,
      createdByUserId: "user-1",
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const stepRow = {
      id: stepId,
      requestId: reqId,
      stepOrder: 1,
      approverUserId: "approver-1",
      status: "pending" as const,
      comment: null,
      decidedAt: null,
      dueAt,
      createdAt: now,
      updatedAt: now,
    };

    let selectCall = 0;
    const db = {
      select: vi.fn().mockImplementation(() => {
        selectCall += 1;
        if (selectCall === 1) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([openReq]),
          };
        }
        if (selectCall === 2) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockResolvedValue([stepRow]),
          };
        }
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" }]),
        }),
      }),
    };

    const out = await recordOverdueApprovalEscalations(db as never, now);
    expect(out.inserted).toBe(1);
    expect(out.newlyCreated).toHaveLength(1);
    expect(out.newlyCreated[0]).toMatchObject({
      escalationEventId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      organizationId: orgId,
      approvalStepId: stepId,
      approvalRequestId: reqId,
      requestEntityType: "capa",
      requestEntityId: capaId,
      stepOrder: 1,
    });
  });
});
