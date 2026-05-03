import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordOverdueObservationFollowUpEscalations } from "@/server/services/observationFollowUpEscalation";

describe("recordOverdueObservationFollowUpEscalations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("inserts one escalation per overdue observation when none exists", async () => {
    const obsId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const orgId = "00000000-0000-4000-8000-000000000001";
    const now = new Date("2026-05-10T12:00:00Z");

    const selectOverdue = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: obsId, organizationId: orgId }]),
    });

    const selectExisting = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });

    const valuesSpy = vi.fn();

    let selectCall = 0;
    const db = {
      select: vi.fn().mockImplementation(() => {
        selectCall += 1;
        return selectCall === 1 ? selectOverdue() : selectExisting();
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((cols) => {
          valuesSpy(cols);
          return {
            returning: vi.fn().mockResolvedValue([
              {
                id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
                organizationId: orgId,
                entityType: "safety_observation",
                entityId: obsId,
                message: `Observation follow-up overdue (id ${obsId}).`,
              },
            ]),
          };
        }),
      }),
    };

    const out = await recordOverdueObservationFollowUpEscalations(db as never, now);
    expect(out.inserted).toBe(1);
    expect(out.newlyCreated).toHaveLength(1);
    expect(out.newlyCreated[0]?.id).toBe("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee");
    expect(valuesSpy).toHaveBeenCalledWith({
      organizationId: orgId,
      entityType: "safety_observation",
      entityId: obsId,
      message: expect.stringContaining(obsId) as unknown as string,
      notifiedUserIds: [],
    });
  });

  it("does not insert when escalation already exists", async () => {
    const obsId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const orgId = "00000000-0000-4000-8000-000000000001";
    const now = new Date("2026-05-10T12:00:00Z");

    const valuesSpy = vi.fn();

    let selectCall = 0;
    const db = {
      select: vi.fn().mockImplementation(() => {
        selectCall += 1;
        if (selectCall === 1) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([{ id: obsId, organizationId: orgId }]),
          };
        }
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([{ id: "prior-escalation-row" }]),
        };
      }),
      insert: vi.fn().mockReturnValue({
        values: valuesSpy,
      }),
    };

    const out = await recordOverdueObservationFollowUpEscalations(db as never, now);
    expect(out.inserted).toBe(0);
    expect(valuesSpy).not.toHaveBeenCalled();
  });
});
