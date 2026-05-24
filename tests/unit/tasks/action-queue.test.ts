import { describe, expect, it } from "vitest";
import {
  buildActionQueueHref,
  buildActionQueueResult,
  countsFromActionQueueItems,
  filterFieldPendingItems,
  scoreActionQueueItem,
  sortActionQueueItems,
  type ActionQueueItem,
} from "@/lib/tasks/actionQueue";

const now = new Date("2026-05-24T12:00:00Z");

function item(partial: Partial<ActionQueueItem> & Pick<ActionQueueItem, "id" | "type" | "recordId" | "title">): ActionQueueItem {
  return {
    reason: "test",
    dueAt: null,
    priorityScore: 50,
    isOverdue: false,
    href: buildActionQueueHref(partial.type),
    ctaLabel: "Open",
    ...partial,
  };
}

describe("scoreActionQueueItem", () => {
  it("ranks overdue approval steps highest", () => {
    const overdue = scoreActionQueueItem({
      type: "approval_step",
      dueAt: null,
      now,
      stepDueAt: new Date("2026-05-20T12:00:00Z"),
    });
    const capa = scoreActionQueueItem({
      type: "capa",
      dueAt: new Date("2026-05-20T12:00:00Z"),
      now,
    });
    expect(overdue.priorityScore).toBeLessThan(capa.priorityScore);
    expect(overdue.isOverdue).toBe(true);
  });
});

describe("buildActionQueueResult", () => {
  it("returns primary as first sorted item", () => {
    const items = [
      item({
        id: "capa:1",
        type: "capa",
        recordId: "1",
        title: "CAPA",
        priorityScore: 30,
      }),
      item({
        id: "approval_step:1",
        type: "approval_step",
        recordId: "1",
        title: "Approve",
        priorityScore: 10,
      }),
    ];
    const result = buildActionQueueResult(items, 5);
    expect(result.primary?.type).toBe("approval_step");
    expect(result.totalCount).toBe(2);
  });
});

describe("countsFromActionQueueItems", () => {
  it("separates approvals from other tasks", () => {
    const counts = countsFromActionQueueItems([
      item({ id: "a:1", type: "approval_step", recordId: "1", title: "A" }),
      item({ id: "c:1", type: "capa", recordId: "1", title: "C" }),
    ]);
    expect(counts).toEqual({ approvalsCount: 1, tasksCount: 1 });
  });
});

describe("filterFieldPendingItems", () => {
  it("includes approvals and due-soon CAPAs only", () => {
    const items = [
      item({
        id: "t:1",
        type: "training",
        recordId: "1",
        title: "Training",
        dueAt: new Date("2026-05-30T12:00:00Z").toISOString(),
      }),
      item({
        id: "c:1",
        type: "capa",
        recordId: "1",
        title: "CAPA soon",
        dueAt: new Date("2026-05-26T12:00:00Z").toISOString(),
        priorityScore: 30,
      }),
      item({
        id: "a:1",
        type: "approval_step",
        recordId: "1",
        title: "Approve",
        priorityScore: 10,
      }),
    ];
    const filtered = filterFieldPendingItems(items, now);
    expect(filtered.map((i) => i.type)).toEqual(["approval_step", "capa"]);
  });
});

describe("sortActionQueueItems", () => {
  it("sorts by priority score then due date", () => {
    const sorted = sortActionQueueItems([
      item({
        id: "c:2",
        type: "capa",
        recordId: "2",
        title: "Later",
        priorityScore: 20,
        dueAt: new Date("2026-05-25T12:00:00Z").toISOString(),
      }),
      item({
        id: "c:1",
        type: "capa",
        recordId: "1",
        title: "Sooner",
        priorityScore: 20,
        dueAt: new Date("2026-05-22T12:00:00Z").toISOString(),
      }),
    ]);
    expect(sorted[0]?.recordId).toBe("1");
  });
});
