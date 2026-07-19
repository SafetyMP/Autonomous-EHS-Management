"use client";

import { useEffect, useRef } from "react";
import { useFieldOutboxUi } from "@/components/field-outbox-ui-bridge";
import { useNavigatorOnline } from "@/hooks/useNavigatorOnline";
import { useOrg } from "@/components/org-context";
import {
  ENVIRONMENTAL_REGULATORY_PERMIT_MEDIA,
  ENVIRONMENTAL_REGULATORY_PERMIT_STATUS,
  INCIDENT_SEVERITIES,
  INCIDENT_TYPES,
  RISK_ASSESSMENT_KINDS,
  RISK_ASSESSMENT_STATUSES,
  RISK_RATINGS,
} from "@/lib/ehs-enums";
import {
  flushFieldOutbox,
  isFieldOutboxEnabled,
  type FieldOutboxRecord,
} from "@/lib/offline/fieldOutbox";
import { trpc } from "@/trpc/react";

type ObsCategory = "positive_behavior" | "at_risk_behavior" | "unsafe_condition" | "other";
type ObsSeverity = "low" | "medium" | "high" | "critical";
type InspectionType = "routine" | "regulatory" | "pre_job" | "other";
type PermitType = "hot_work" | "confined_space" | "work_at_height" | "other";
type EnvMedia = (typeof ENVIRONMENTAL_REGULATORY_PERMIT_MEDIA)[number];
type EnvStatus = (typeof ENVIRONMENTAL_REGULATORY_PERMIT_STATUS)[number];
type RiskKind = (typeof RISK_ASSESSMENT_KINDS)[number];
type RiskStatus = (typeof RISK_ASSESSMENT_STATUSES)[number];
type RiskRating = (typeof RISK_RATINGS)[number];

/**
 * Replays IndexedDB field outbox rows through real tRPC mutations when online.
 * Flush outcomes feed FieldOutboxStatusBar (status-region-first; ADR-UX-003).
 * Mounted once under OrgProvider — see docs/offline-field-outbox.md.
 */
export function FieldOutboxGlobalSync() {
  const { organizationId } = useOrg();
  const { flushNonce, reportFlushResult } = useFieldOutboxUi();
  const online = useNavigatorOnline();
  const utils = trpc.useUtils();
  const busy = useRef(false);

  const incidentCreate = trpc.incident.create.useMutation({
    onSuccess: () => void utils.incident.list.invalidate(),
  });
  const observationCreate = trpc.observation.create.useMutation({
    onSuccess: () => void utils.observation.list.invalidate(),
  });
  const inspectionCreate = trpc.inspection.create.useMutation({
    onSuccess: () => void utils.inspection.list.invalidate(),
  });
  const inspectionUpdateStatus = trpc.inspection.updateStatus.useMutation({
    onSuccess: () => {
      void utils.inspection.list.invalidate();
    },
  });
  const permitCreate = trpc.permit.create.useMutation({
    onSuccess: () => void utils.permit.list.invalidate(),
  });
  const permitSubmit = trpc.permit.submitForApproval.useMutation({
    onSuccess: () => permitInvalidateAll(utils),
  });
  const envPermitCreate = trpc.environmentalRegulatoryPermit.create.useMutation({
    onSuccess: () => void utils.environmentalRegulatoryPermit.list.invalidate(),
  });
  const envPermitSubmit = trpc.environmentalRegulatoryPermit.submitForApproval.useMutation({
    onSuccess: () => permitInvalidateAll(utils),
  });
  const riskCreate = trpc.planning.risk.create.useMutation({
    onSuccess: () => void utils.planning.risk.list.invalidate(),
  });

  useEffect(() => {
    if (!organizationId || !online || !isFieldOutboxEnabled() || busy.current) return;
    busy.current = true;

    const run = async (row: FieldOutboxRecord): Promise<"handled" | "skipped"> => {
      switch (row.procedure) {
        case "incident.create": {
          const p = JSON.parse(row.payloadJson) as {
            organizationId: string;
            title: string;
            description: string;
            severity: (typeof INCIDENT_SEVERITIES)[number];
            incidentType: (typeof INCIDENT_TYPES)[number];
            siteId?: string | null;
            occurredAt?: string | null;
            immediateActions?: string | null;
            regulatoryNotificationRequired?: boolean | null;
          };
          await incidentCreate.mutateAsync({
            organizationId: p.organizationId,
            title: p.title,
            description: p.description,
            severity: p.severity,
            incidentType: p.incidentType,
            siteId: p.siteId || undefined,
            occurredAt:
              p.occurredAt && typeof p.occurredAt === "string"
                ? new Date(p.occurredAt)
                : undefined,
            immediateActions:
              typeof p.immediateActions === "string" && p.immediateActions.trim()
                ? p.immediateActions.trim()
                : undefined,
            regulatoryNotificationRequired:
              typeof p.regulatoryNotificationRequired === "boolean"
                ? p.regulatoryNotificationRequired
                : undefined,
            idempotencyKey: row.localId,
          });
          return "handled";
        }
        case "observation.create": {
          const p = JSON.parse(row.payloadJson) as {
            organizationId: string;
            summary: string;
            details: string | null;
            category: ObsCategory;
            severity: ObsSeverity;
            siteId: string | null;
            observedAt: string | null;
          };
          await observationCreate.mutateAsync({
            organizationId: p.organizationId,
            summary: p.summary,
            details: p.details,
            category: p.category,
            severity: p.severity,
            siteId: p.siteId,
            observedAt: p.observedAt ? new Date(p.observedAt) : undefined,
            idempotencyKey: row.localId,
          });
          return "handled";
        }
        case "inspection.create": {
          const p = JSON.parse(row.payloadJson) as {
            organizationId: string;
            title: string;
            inspectionType: InspectionType;
            scheduledAt: string | null;
            notes: string | null;
          };
          let sched: Date | undefined;
          if (p.scheduledAt) {
            const d = new Date(p.scheduledAt);
            if (!Number.isNaN(d.getTime())) sched = d;
          }
          await inspectionCreate.mutateAsync({
            organizationId: p.organizationId,
            title: p.title,
            inspectionType: p.inspectionType,
            scheduledAt: sched,
            notes: p.notes ?? undefined,
            idempotencyKey: row.localId,
          });
          return "handled";
        }
        case "inspection.updateStatus": {
          const p = JSON.parse(row.payloadJson) as {
            organizationId: string;
            inspectionId: string;
            status: "in_progress" | "completed" | "cancelled" | "scheduled";
          };
          await inspectionUpdateStatus.mutateAsync({
            organizationId: p.organizationId,
            inspectionId: p.inspectionId,
            status: p.status,
            idempotencyKey: row.localId,
          });
          return "handled";
        }
        case "permit.create": {
          const p = JSON.parse(row.payloadJson) as {
            organizationId: string;
            title: string;
            permitType: PermitType;
            siteId: string | null;
            validFrom: string;
            validTo: string;
            workSummary: string;
            hazardsControls: string | null;
          };
          await permitCreate.mutateAsync({
            organizationId: p.organizationId,
            title: p.title,
            permitType: p.permitType,
            siteId: p.siteId || undefined,
            validFrom: new Date(p.validFrom),
            validTo: new Date(p.validTo),
            workSummary: p.workSummary,
            hazardsControls: p.hazardsControls ?? undefined,
            idempotencyKey: row.localId,
          });
          return "handled";
        }
        case "permit.submitForApproval": {
          const p = JSON.parse(row.payloadJson) as {
            organizationId: string;
            permitId: string;
            approvers: string[];
          };
          await permitSubmit.mutateAsync({
            organizationId: p.organizationId,
            permitId: p.permitId,
            approvers: p.approvers,
            idempotencyKey: row.localId,
          });
          return "handled";
        }
        case "environmentalRegulatoryPermit.create": {
          const p = JSON.parse(row.payloadJson) as {
            organizationId: string;
            title: string;
            permitIdentifier: string;
            agency?: string | null;
            jurisdiction?: string | null;
            media?: string;
            status?: string;
            siteId?: string | null;
            issuedAt?: string | null;
            effectiveFrom?: string | null;
            expiresAt?: string | null;
            legalCitations?: string | null;
            limits?: Record<string, string | number | boolean | null>;
            complianceObligationId?: string | null;
            ownerUserId?: string | null;
            conditions?: { conditionText: string; referenceCode?: string | null }[];
          };
          const media: EnvMedia = ENVIRONMENTAL_REGULATORY_PERMIT_MEDIA.includes(
            p.media as EnvMedia,
          )
            ? (p.media as EnvMedia)
            : "general";
          let status: EnvStatus = (p.status as EnvStatus) ?? "draft";
          if (!ENVIRONMENTAL_REGULATORY_PERMIT_STATUS.includes(status)) status = "draft";
          if (status === "pending_approval") status = "draft";
          await envPermitCreate.mutateAsync({
            organizationId: p.organizationId,
            title: p.title,
            permitIdentifier: p.permitIdentifier,
            agency: p.agency ?? null,
            jurisdiction: p.jurisdiction ?? null,
            media,
            status,
            siteId: p.siteId ?? null,
            issuedAt: p.issuedAt ? new Date(p.issuedAt) : null,
            effectiveFrom: p.effectiveFrom ? new Date(p.effectiveFrom) : null,
            expiresAt: p.expiresAt ? new Date(p.expiresAt) : null,
            legalCitations: p.legalCitations ?? null,
            limits: p.limits,
            complianceObligationId: p.complianceObligationId ?? null,
            ownerUserId: p.ownerUserId ?? null,
            conditions: p.conditions?.length
              ? p.conditions.map((c, i) => ({
                  sortOrder: i,
                  conditionText: c.conditionText,
                  referenceCode: c.referenceCode ?? null,
                }))
              : undefined,
            idempotencyKey: row.localId,
          });
          return "handled";
        }
        case "environmentalRegulatoryPermit.submitForApproval": {
          const p = JSON.parse(row.payloadJson) as {
            organizationId: string;
            permitId: string;
            approvers: string[];
          };
          await envPermitSubmit.mutateAsync({
            organizationId: p.organizationId,
            permitId: p.permitId,
            approvers: p.approvers,
            idempotencyKey: row.localId,
          });
          return "handled";
        }
        case "planning.risk.create": {
          const p = JSON.parse(row.payloadJson) as {
            organizationId: string;
            context: string;
            hazardId?: string;
            siteId?: string;
            summaryTitle?: string | null;
            assessmentKind?: string;
            status?: string;
            reviewDueAt?: string | null;
            existingControls?: string;
            inherentRating?: string;
            likelihoodScore?: number;
            consequenceScore?: number;
            residualRating?: string;
            steps?: {
              sortOrder?: number;
              taskDescription: string;
              hazardText: string;
              controlsText?: string | null;
              inherentRating?: string | null;
              residualRating?: string | null;
            }[];
          };
          let assessmentKind: RiskKind = (p.assessmentKind as RiskKind) ?? "general";
          if (!RISK_ASSESSMENT_KINDS.includes(assessmentKind)) assessmentKind = "general";
          let status: RiskStatus | undefined = p.status as RiskStatus | undefined;
          if (status !== undefined && !RISK_ASSESSMENT_STATUSES.includes(status)) {
            status = undefined;
          }
          let residual: RiskRating | undefined = p.residualRating as RiskRating | undefined;
          if (residual !== undefined && !RISK_RATINGS.includes(residual)) residual = undefined;
          let inherent: RiskRating | undefined = p.inherentRating as RiskRating | undefined;
          if (inherent !== undefined && !RISK_RATINGS.includes(inherent)) inherent = undefined;

          const stepRatings = (
            v: string | null | undefined,
          ): RiskRating | null | undefined => {
            if (v === null || v === undefined) return v as null | undefined;
            return RISK_RATINGS.includes(v as RiskRating) ? (v as RiskRating) : null;
          };

          await riskCreate.mutateAsync({
            organizationId: p.organizationId,
            context: p.context,
            hazardId: p.hazardId,
            siteId: p.siteId,
            summaryTitle: p.summaryTitle ?? undefined,
            assessmentKind,
            status,
            reviewDueAt: p.reviewDueAt ? new Date(p.reviewDueAt) : null,
            existingControls: p.existingControls,
            inherentRating: inherent,
            likelihoodScore: p.likelihoodScore,
            consequenceScore: p.consequenceScore,
            residualRating: residual,
            steps: p.steps?.map((s, i) => ({
              sortOrder: s.sortOrder ?? i,
              taskDescription: s.taskDescription,
              hazardText: s.hazardText,
              controlsText: s.controlsText ?? null,
              inherentRating: stepRatings(s.inherentRating ?? undefined) ?? null,
              residualRating: stepRatings(s.residualRating ?? undefined) ?? null,
            })),
            idempotencyKey: row.localId,
          });
          return "handled";
        }
        default:
          return "skipped";
      }
    };

    let cancelled = false;
    void flushFieldOutbox(organizationId, run)
      .then(({ sent, failed }) => {
        if (cancelled) return;
        reportFlushResult({ sent, failed });
        if (sent === 0) return;
        void utils.incident.list.invalidate();
        void utils.observation.list.invalidate();
        void utils.inspection.list.invalidate();
        void utils.permit.list.invalidate();
        void permitInvalidateAll(utils);
        void utils.environmentalRegulatoryPermit.list.invalidate();
        void utils.planning.risk.list.invalidate();
      })
      .finally(() => {
        if (!cancelled) busy.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [
    flushNonce,
    online,
    organizationId,
    reportFlushResult,
    incidentCreate,
    observationCreate,
    inspectionCreate,
    inspectionUpdateStatus,
    permitCreate,
    permitSubmit,
    envPermitCreate,
    envPermitSubmit,
    riskCreate,
    utils,
  ]);

  return null;
}

function permitInvalidateAll(utils: ReturnType<typeof trpc.useUtils>) {
  void utils.approval.listOpenWorkPermitRequests.invalidate();
  void utils.approval.listOpenEnvironmentalRegulatoryPermitRequests.invalidate();
  void utils.approval.listMyPendingSteps.invalidate();
}
