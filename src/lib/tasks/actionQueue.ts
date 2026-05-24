export type ActionQueueItemType =
  | "approval_step"
  | "capa"
  | "training"
  | "obligation_review"
  | "management_review";

export type ActionQueueItem = {
  id: string;
  type: ActionQueueItemType;
  recordId: string;
  title: string;
  reason: string;
  dueAt: string | null;
  priorityScore: number;
  isOverdue: boolean;
  href: string;
  ctaLabel: string;
};

export type ActionQueueResult = {
  primary: ActionQueueItem | null;
  items: ActionQueueItem[];
  totalCount: number;
  generatedAt: string;
};

export type ActionQueueCounts = {
  approvalsCount: number;
  tasksCount: number;
};

const MS_DAY = 24 * 60 * 60 * 1000;

export function approvalEntityLabel(entityType: string): string {
  if (entityType === "capa") return "CAPA plan";
  if (entityType === "work_permit") return "Work permit";
  if (entityType === "environmental_regulatory_permit") return "Environmental permit";
  return "Approval";
}

export function buildActionQueueHref(type: ActionQueueItemType, recordId?: string): string {
  switch (type) {
    case "approval_step":
      return "/dashboard/approvals";
    case "capa":
      return recordId ? `/dashboard/capa/${recordId}` : "/dashboard/capa";
    case "training":
      return "/dashboard/training";
    case "obligation_review":
      return recordId
        ? `/dashboard/environment?obligation=${recordId}`
        : "/dashboard/environment";
    case "management_review":
      return recordId
        ? `/dashboard/management-review?review=${recordId}`
        : "/dashboard/management-review";
    default:
      return "/dashboard/tasks";
  }
}

export function ctaLabelForType(type: ActionQueueItemType): string {
  switch (type) {
    case "approval_step":
      return "Review & decide";
    case "capa":
      return "Open CAPA";
    case "training":
      return "View training";
    case "obligation_review":
      return "Review obligation";
    case "management_review":
      return "Open review";
    default:
      return "Open";
  }
}

export function reasonForItem(
  type: ActionQueueItemType,
  isOverdue: boolean,
  entityType?: string,
): string {
  if (type === "approval_step") {
    return isOverdue ? "Approval step overdue" : "Pending your approval";
  }
  if (type === "capa") {
    return isOverdue ? "CAPA overdue" : "CAPA due soon";
  }
  if (type === "training") {
    return isOverdue ? "Training expired" : "Training expiring soon";
  }
  if (type === "obligation_review") {
    return isOverdue ? "Obligation review overdue" : "Obligation review due";
  }
  if (type === "management_review") {
    return isOverdue ? "Management review overdue" : "Management review due";
  }
  if (entityType) return approvalEntityLabel(entityType);
  return "Action required";
}

type ScoreInput = {
  type: ActionQueueItemType;
  dueAt: Date | null;
  now: Date;
  stepDueAt?: Date | null;
};

export function scoreActionQueueItem(input: ScoreInput): { priorityScore: number; isOverdue: boolean } {
  const { type, dueAt, now, stepDueAt } = input;
  const effectiveDue = stepDueAt ?? dueAt;
  const isOverdue = effectiveDue != null && effectiveDue.getTime() < now.getTime();

  if (type === "approval_step") {
    return { priorityScore: isOverdue ? 10 : 12, isOverdue };
  }
  if (type === "capa") {
    if (isOverdue) return { priorityScore: 20, isOverdue: true };
    if (dueAt && dueAt.getTime() - now.getTime() <= 7 * MS_DAY) {
      return { priorityScore: 30, isOverdue: false };
    }
    return { priorityScore: 35, isOverdue: false };
  }
  if (type === "training") {
    return { priorityScore: isOverdue ? 38 : 40, isOverdue };
  }
  if (type === "obligation_review") {
    return { priorityScore: isOverdue ? 58 : 60, isOverdue };
  }
  if (type === "management_review") {
    return { priorityScore: isOverdue ? 68 : 70, isOverdue };
  }
  return { priorityScore: 99, isOverdue };
}

export function sortActionQueueItems(items: ActionQueueItem[]): ActionQueueItem[] {
  return [...items].sort((a, b) => {
    if (a.priorityScore !== b.priorityScore) return a.priorityScore - b.priorityScore;
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;
    return a.title.localeCompare(b.title);
  });
}

export function buildActionQueueResult(
  items: ActionQueueItem[],
  limit: number,
): ActionQueueResult {
  const sorted = sortActionQueueItems(items);
  const sliced = sorted.slice(0, limit);
  return {
    primary: sliced[0] ?? null,
    items: sliced,
    totalCount: sorted.length,
    generatedAt: new Date().toISOString(),
  };
}

export function countsFromActionQueueItems(items: ActionQueueItem[]): ActionQueueCounts {
  let approvalsCount = 0;
  let tasksCount = 0;
  for (const item of items) {
    if (item.type === "approval_step") approvalsCount += 1;
    else tasksCount += 1;
  }
  return { approvalsCount, tasksCount };
}

/** Field home: approvals + owned CAPAs due within 7 days or overdue. */
export function filterFieldPendingItems(items: ActionQueueItem[], now = new Date()): ActionQueueItem[] {
  const horizon = now.getTime() + 7 * MS_DAY;
  return sortActionQueueItems(items).filter((item) => {
    if (item.type === "approval_step") return true;
    if (item.type !== "capa") return false;
    if (item.isOverdue) return true;
    if (!item.dueAt) return false;
    return new Date(item.dueAt).getTime() <= horizon;
  });
}
