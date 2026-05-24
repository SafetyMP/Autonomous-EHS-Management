import { and, asc, desc, eq, inArray, isNotNull, lte, or } from "drizzle-orm";
import type { Db } from "@/server/db";
import {
  approvalRequest,
  approvalStep,
  complianceObligation,
  correctiveAction,
  environmentalRegulatoryPermit,
  externalParty,
  externalPartyCredential,
  managementReview,
  trainingRecord,
  workPermit,
} from "@/server/db/schema";
import { PERMISSIONS, userHasPermission } from "@/lib/rbac";
import {
  approvalEntityLabel,
  buildActionQueueHref,
  buildActionQueueResult,
  countsFromActionQueueItems,
  ctaLabelForType,
  reasonForItem,
  scoreActionQueueItem,
  type ActionQueueItem,
  type ActionQueueCounts,
  type ActionQueueResult,
} from "@/lib/tasks/actionQueue";
import { approvalRequestEntityTypeCondition } from "@/server/services/approvalRequestEntityTypeCondition";

const MS_DAY = 24 * 60 * 60 * 1000;

type DbLike = Pick<Db, "select">;

async function loadApprovalTitles(
  db: DbLike,
  organizationId: string,
  rows: { entityType: string; entityId: string }[],
): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  const capaIds = rows.filter((r) => r.entityType === "capa").map((r) => r.entityId);
  const permitIds = rows.filter((r) => r.entityType === "work_permit").map((r) => r.entityId);
  const envIds = rows
    .filter((r) => r.entityType === "environmental_regulatory_permit")
    .map((r) => r.entityId);

  if (capaIds.length > 0) {
    const capas = await db
      .select({ id: correctiveAction.id, title: correctiveAction.title })
      .from(correctiveAction)
      .where(
        and(
          eq(correctiveAction.organizationId, organizationId),
          inArray(correctiveAction.id, capaIds),
        ),
      );
    for (const c of capas) titles.set(`capa:${c.id}`, c.title);
  }

  if (permitIds.length > 0) {
    const permits = await db
      .select({ id: workPermit.id, title: workPermit.title })
      .from(workPermit)
      .where(and(eq(workPermit.organizationId, organizationId), inArray(workPermit.id, permitIds)));
    for (const p of permits) titles.set(`work_permit:${p.id}`, p.title);
  }

  if (envIds.length > 0) {
    const envPermits = await db
      .select({ id: environmentalRegulatoryPermit.id, title: environmentalRegulatoryPermit.title })
      .from(environmentalRegulatoryPermit)
      .where(
        and(
          eq(environmentalRegulatoryPermit.organizationId, organizationId),
          inArray(environmentalRegulatoryPermit.id, envIds),
        ),
      );
    for (const p of envPermits) titles.set(`environmental_regulatory_permit:${p.id}`, p.title);
  }

  return titles;
}

async function fetchPendingApprovalItems(
  db: DbLike,
  organizationId: string,
  userId: string,
  now: Date,
): Promise<ActionQueueItem[]> {
  const capaOk = await userHasPermission(db as Db, userId, organizationId, PERMISSIONS.CAPA_APPROVE);
  const wpOk = await userHasPermission(
    db as Db,
    userId,
    organizationId,
    PERMISSIONS.WORK_PERMIT_APPROVE,
  );
  const envPermOk = await userHasPermission(
    db as Db,
    userId,
    organizationId,
    PERMISSIONS.ENVIRONMENTAL_PERMIT_APPROVE,
  );

  if (!capaOk && !wpOk && !envPermOk) return [];

  const entityCond = approvalRequestEntityTypeCondition({
    capaApprove: capaOk,
    permitApprove: wpOk,
    environmentalPermitApprove: envPermOk,
  });

  const rows = await db
    .select({
      step: approvalStep,
      request: approvalRequest,
    })
    .from(approvalStep)
    .innerJoin(approvalRequest, eq(approvalStep.requestId, approvalRequest.id))
    .where(
      and(
        eq(approvalRequest.organizationId, organizationId),
        eq(approvalStep.approverUserId, userId),
        eq(approvalStep.status, "pending"),
        eq(approvalRequest.status, "open"),
        entityCond,
      ),
    )
    .orderBy(desc(approvalRequest.createdAt), asc(approvalStep.stepOrder));

  const titleMap = await loadApprovalTitles(
    db,
    organizationId,
    rows.map((r) => ({ entityType: r.request.entityType, entityId: r.request.entityId })),
  );

  return rows.map(({ step, request }) => {
    const titleKey = `${request.entityType}:${request.entityId}`;
    const entityTitle =
      titleMap.get(titleKey) ?? approvalEntityLabel(request.entityType);
    const dueAt = step.dueAt ?? request.createdAt;
    const { priorityScore, isOverdue } = scoreActionQueueItem({
      type: "approval_step",
      dueAt: null,
      now,
      stepDueAt: dueAt,
    });
    return {
      id: `approval_step:${step.id}`,
      type: "approval_step" as const,
      recordId: step.id,
      title: `Approve ${approvalEntityLabel(request.entityType)} — ${entityTitle}`,
      reason: reasonForItem("approval_step", isOverdue, request.entityType),
      dueAt: dueAt.toISOString(),
      priorityScore,
      isOverdue,
      href: buildActionQueueHref("approval_step"),
      ctaLabel: ctaLabelForType("approval_step"),
    };
  });
}

export async function collectActionQueueItems(
  db: DbLike,
  organizationId: string,
  userId: string,
  opts: { includeOrgWide: boolean },
  now = new Date(),
): Promise<ActionQueueItem[]> {
  const items: ActionQueueItem[] = [];

  const approvalItems = await fetchPendingApprovalItems(db, organizationId, userId, now);
  items.push(...approvalItems);

  const capas = await db
    .select({
      id: correctiveAction.id,
      title: correctiveAction.title,
      dueDate: correctiveAction.dueDate,
    })
    .from(correctiveAction)
    .where(
      and(
        eq(correctiveAction.organizationId, organizationId),
        eq(correctiveAction.ownerUserId, userId),
        or(
          eq(correctiveAction.status, "pending_approval"),
          eq(correctiveAction.status, "planned"),
          eq(correctiveAction.status, "in_progress"),
        ),
      ),
    );

  for (const capa of capas) {
    const dueAt = capa.dueDate ?? null;
    const { priorityScore, isOverdue } = scoreActionQueueItem({
      type: "capa",
      dueAt,
      now,
    });
    items.push({
      id: `capa:${capa.id}`,
      type: "capa",
      recordId: capa.id,
      title: capa.title,
      reason: reasonForItem("capa", isOverdue),
      dueAt: dueAt?.toISOString() ?? null,
      priorityScore,
      isOverdue,
      href: buildActionQueueHref("capa", capa.id),
      ctaLabel: ctaLabelForType("capa"),
    });
  }

  const trainingHorizon = new Date(now.getTime() + 30 * MS_DAY);
  const upcomingTraining = await db
    .select({
      id: trainingRecord.id,
      courseTitle: trainingRecord.courseTitle,
      expiresOn: trainingRecord.expiresOn,
    })
    .from(trainingRecord)
    .where(
      and(
        eq(trainingRecord.organizationId, organizationId),
        eq(trainingRecord.userId, userId),
        lte(trainingRecord.expiresOn, trainingHorizon),
        isNotNull(trainingRecord.expiresOn),
      ),
    );

  for (const tr of upcomingTraining) {
    const dueAt = tr.expiresOn!;
    const { priorityScore, isOverdue } = scoreActionQueueItem({
      type: "training",
      dueAt,
      now,
    });
    items.push({
      id: `training:${tr.id}`,
      type: "training",
      recordId: tr.id,
      title: tr.courseTitle,
      reason: reasonForItem("training", isOverdue),
      dueAt: dueAt.toISOString(),
      priorityScore,
      isOverdue,
      href: buildActionQueueHref("training"),
      ctaLabel: ctaLabelForType("training"),
    });
  }

  if (opts.includeOrgWide) {
    const obligationOk = await userHasPermission(
      db as Db,
      userId,
      organizationId,
      PERMISSIONS.OBLIGATION_READ,
    );
    if (obligationOk) {
      const overdueObligations = await db
        .select({
          id: complianceObligation.id,
          title: complianceObligation.title,
          due: complianceObligation.nextReviewDue,
        })
        .from(complianceObligation)
        .where(
          and(
            eq(complianceObligation.organizationId, organizationId),
            lte(complianceObligation.nextReviewDue, now),
            isNotNull(complianceObligation.nextReviewDue),
          ),
        )
        .limit(25);

      for (const ob of overdueObligations) {
        const dueAt = ob.due!;
        const { priorityScore, isOverdue } = scoreActionQueueItem({
          type: "obligation_review",
          dueAt,
          now,
        });
        items.push({
          id: `obligation_review:${ob.id}`,
          type: "obligation_review",
          recordId: ob.id,
          title: ob.title,
          reason: reasonForItem("obligation_review", isOverdue),
          dueAt: dueAt.toISOString(),
          priorityScore,
          isOverdue,
          href: buildActionQueueHref("obligation_review", ob.id),
          ctaLabel: ctaLabelForType("obligation_review"),
        });
      }
    }

    const mrOk = await userHasPermission(db as Db, userId, organizationId, PERMISSIONS.MR_READ);
    if (mrOk) {
      const reviews = await db
        .select({
          id: managementReview.id,
          summary: managementReview.summary,
          due: managementReview.nextReviewDue,
        })
        .from(managementReview)
        .where(
          and(
            eq(managementReview.organizationId, organizationId),
            lte(managementReview.nextReviewDue, now),
            isNotNull(managementReview.nextReviewDue),
          ),
        )
        .limit(25);

      for (const review of reviews) {
        const dueAt = review.due!;
        const { priorityScore, isOverdue } = scoreActionQueueItem({
          type: "management_review",
          dueAt,
          now,
        });
        items.push({
          id: `management_review:${review.id}`,
          type: "management_review",
          recordId: review.id,
          title: review.summary,
          reason: reasonForItem("management_review", isOverdue),
          dueAt: dueAt.toISOString(),
          priorityScore,
          isOverdue,
          href: buildActionQueueHref("management_review", review.id),
          ctaLabel: ctaLabelForType("management_review"),
        });
      }
    }

    const externalPartyOk = await userHasPermission(
      db as Db,
      userId,
      organizationId,
      PERMISSIONS.EXTERNAL_PARTY_READ,
    );
    if (externalPartyOk) {
      const horizon = new Date(now.getTime() + 30 * MS_DAY);
      const renewalRows = await db
        .select({
          credential: externalPartyCredential,
          party: externalParty,
        })
        .from(externalPartyCredential)
        .innerJoin(externalParty, eq(externalPartyCredential.externalPartyId, externalParty.id))
        .where(
          and(
            eq(externalPartyCredential.organizationId, organizationId),
            isNotNull(externalPartyCredential.validTo),
            inArray(externalPartyCredential.status, ["active", "pending_review", "expired"]),
            lte(externalPartyCredential.validTo, horizon),
          ),
        )
        .orderBy(asc(externalPartyCredential.validTo))
        .limit(25);

      for (const { credential, party } of renewalRows) {
        const dueAt = credential.validTo!;
        const { priorityScore, isOverdue } = scoreActionQueueItem({
          type: "contractor_credential",
          dueAt,
          now,
        });
        const kindLabel = credential.kind.replace(/_/g, " ");
        items.push({
          id: `contractor_credential:${credential.id}`,
          type: "contractor_credential",
          recordId: party.id,
          title: `${party.companyName} — ${kindLabel}`,
          reason: reasonForItem("contractor_credential", isOverdue),
          dueAt: dueAt.toISOString(),
          priorityScore,
          isOverdue,
          href: buildActionQueueHref("contractor_credential", party.id),
          ctaLabel: ctaLabelForType("contractor_credential"),
        });
      }
    }
  }

  return items;
}

export async function queryActionQueue(
  db: DbLike,
  organizationId: string,
  userId: string,
  opts: { limit: number; includeOrgWide: boolean },
): Promise<ActionQueueResult> {
  const items = await collectActionQueueItems(db, organizationId, userId, opts);
  return buildActionQueueResult(items, opts.limit);
}

export async function queryActionQueueCounts(
  db: DbLike,
  organizationId: string,
  userId: string,
): Promise<ActionQueueCounts> {
  const items = await collectActionQueueItems(db, organizationId, userId, {
    includeOrgWide: false,
  });
  return countsFromActionQueueItems(items);
}
