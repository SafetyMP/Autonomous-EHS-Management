import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/server/db";
import {
  authUser,
  integrationEvent,
  integrationRosterSnapshot,
  membership,
} from "@/server/db/schema";
import { normalizeIntegrationEmail } from "@/lib/integration/inboundEnvelope";
import {
  rosterSnapshotWorkerSchema,
  type RosterSnapshotWorker,
} from "@/lib/integration/rosterSnapshot";
import { writeAuditLog } from "@/server/services/audit";

export type { RosterSnapshotWorker };
export { rosterSnapshotWorkerSchema };

export type RosterDriftItem = {
  workerEmail: string;
  externalWorkerId: string | null;
  reason: "in_hris_not_in_ehs" | "in_ehs_not_in_hris";
};

export async function ingestRosterSnapshot(
  db: Pick<Db, "insert">,
  organizationId: string,
  workers: RosterSnapshotWorker[],
  source = "hris_export",
): Promise<{ snapshotId: string }> {
  const [row] = await db
    .insert(integrationRosterSnapshot)
    .values({
      organizationId,
      source,
      workers,
    })
    .returning({ id: integrationRosterSnapshot.id });
  return { snapshotId: row!.id };
}

export async function computeRosterDrift(
  db: Pick<Db, "select">,
  organizationId: string,
  snapshotWorkers: RosterSnapshotWorker[],
): Promise<RosterDriftItem[]> {
  const hrisEmails = new Set(
    snapshotWorkers.map((w) => normalizeIntegrationEmail(w.workerEmail)),
  );

  const activeMemberships = await db
    .select({
      email: authUser.email,
      externalWorkerId: membership.externalWorkerId,
      lifecycleStatus: membership.lifecycleStatus,
    })
    .from(membership)
    .innerJoin(authUser, eq(membership.userId, authUser.id))
    .where(eq(membership.organizationId, organizationId));

  const ehsActive = activeMemberships.filter(
    (m) => m.lifecycleStatus === "active" || m.lifecycleStatus === "suspended",
  );
  const ehsEmails = new Set(ehsActive.map((m) => normalizeIntegrationEmail(m.email)));

  const drift: RosterDriftItem[] = [];

  for (const worker of snapshotWorkers) {
    const email = normalizeIntegrationEmail(worker.workerEmail);
    if (!ehsEmails.has(email)) {
      drift.push({
        workerEmail: email,
        externalWorkerId: worker.externalWorkerId ?? null,
        reason: "in_hris_not_in_ehs",
      });
    }
  }

  for (const mem of ehsActive) {
    const email = normalizeIntegrationEmail(mem.email);
    if (!hrisEmails.has(email)) {
      drift.push({
        workerEmail: email,
        externalWorkerId: mem.externalWorkerId ?? null,
        reason: "in_ehs_not_in_hris",
      });
    }
  }

  return drift;
}

export async function reconcileRosterForOrg(
  db: Pick<Db, "select" | "insert">,
  organizationId: string,
): Promise<{ driftCount: number; snapshotId: string | null }> {
  const [latest] = await db
    .select()
    .from(integrationRosterSnapshot)
    .where(eq(integrationRosterSnapshot.organizationId, organizationId))
    .orderBy(desc(integrationRosterSnapshot.capturedAt))
    .limit(1);

  if (!latest) {
    return { driftCount: 0, snapshotId: null };
  }

  const parsed = z.array(rosterSnapshotWorkerSchema).safeParse(latest.workers);
  if (!parsed.success) {
    return { driftCount: 0, snapshotId: latest.id };
  }

  const drift = await computeRosterDrift(db, organizationId, parsed.data);

  if (drift.length > 0) {
    await db.insert(integrationEvent).values({
      organizationId,
      eventType: "roster_reconcile_drift",
      payload: { snapshotId: latest.id, driftCount: drift.length, items: drift.slice(0, 50) },
      processingStatus: "applied",
      appliedAt: new Date(),
    });

    await writeAuditLog(db, {
      organizationId,
      actorUserId: null,
      action: "integration.roster_reconcile",
      entityType: "integration_roster_snapshot",
      entityId: latest.id,
      payload: { driftCount: drift.length },
    });
  }

  return { driftCount: drift.length, snapshotId: latest.id };
}

export async function getLatestRosterDriftSummary(
  db: Pick<Db, "select">,
  organizationId: string,
): Promise<{ driftCount: number; capturedAt: Date | null; snapshotId: string | null }> {
  const [latest] = await db
    .select()
    .from(integrationRosterSnapshot)
    .where(eq(integrationRosterSnapshot.organizationId, organizationId))
    .orderBy(desc(integrationRosterSnapshot.capturedAt))
    .limit(1);

  if (!latest) {
    return { driftCount: 0, capturedAt: null, snapshotId: null };
  }

  const parsed = z.array(rosterSnapshotWorkerSchema).safeParse(latest.workers);
  if (!parsed.success) {
    return { driftCount: 0, capturedAt: latest.capturedAt, snapshotId: latest.id };
  }

  const drift = await computeRosterDrift(db, organizationId, parsed.data);
  return { driftCount: drift.length, capturedAt: latest.capturedAt, snapshotId: latest.id };
}

/** Ingest snapshot from inbound iPaaS batch POST (optional path). */
export async function ingestRosterSnapshotFromPayload(
  db: Pick<Db, "insert" | "select">,
  organizationId: string,
  workers: RosterSnapshotWorker[],
): Promise<{ snapshotId: string; driftCount: number }> {
  const { snapshotId } = await ingestRosterSnapshot(db, organizationId, workers);
  const drift = await computeRosterDrift(db, organizationId, workers);
  return { snapshotId, driftCount: drift.length };
}

export async function listMembershipEmailsForOrg(
  db: Pick<Db, "select">,
  organizationId: string,
  emails: string[],
): Promise<Set<string>> {
  if (emails.length === 0) return new Set();
  const normalized = emails.map(normalizeIntegrationEmail);
  const rows = await db
    .select({ email: authUser.email })
    .from(membership)
    .innerJoin(authUser, eq(membership.userId, authUser.id))
    .where(
      and(
        eq(membership.organizationId, organizationId),
        inArray(authUser.email, normalized),
      ),
    );
  return new Set(rows.map((r) => normalizeIntegrationEmail(r.email)));
}
