import { and, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import type { HrisContractorSyncInput } from "@/lib/integration/hrisContractorSync";
import { externalParty, site } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";

type DbLike = Pick<Db, "select" | "insert" | "update">;

export async function applyHrisContractorSync(
  db: DbLike,
  input: HrisContractorSyncInput,
  eventId: string,
  actorUserId: string | null,
): Promise<{ externalPartyId: string; created: boolean }> {
  if (input.siteId) {
    const [st] = await db
      .select({ id: site.id })
      .from(site)
      .where(and(eq(site.id, input.siteId), eq(site.organizationId, input.organizationId)))
      .limit(1);
    if (!st) {
      throw new Error("siteId is not in this organization.");
    }
  }

  const [existing] = await db
    .select({ id: externalParty.id })
    .from(externalParty)
    .where(
      and(
        eq(externalParty.organizationId, input.organizationId),
        eq(externalParty.externalWorkerId, input.externalWorkerId),
      ),
    )
    .limit(1);

  const terminated = input.employmentStatus === "terminated";

  if (existing) {
    await db
      .update(externalParty)
      .set({
        companyName: input.companyName,
        contactName: input.contactName ?? null,
        contactEmail: input.contactEmail ?? null,
        siteId: input.siteId ?? null,
        partyType: input.partyType,
        hrisSource: input.hrisSource ?? null,
        updatedAt: new Date(),
        ...(terminated ? { hseRequirementsNote: "Terminated in HRIS/VMS — review credentials." } : {}),
      })
      .where(eq(externalParty.id, existing.id));

    await writeAuditLog(db, {
      organizationId: input.organizationId,
      actorUserId,
      action: "integration.hris_contractor_sync",
      entityType: "external_party",
      entityId: existing.id,
      payload: { integrationEventId: eventId, externalWorkerId: input.externalWorkerId },
    });

    return { externalPartyId: existing.id, created: false };
  }

  const [inserted] = await db
    .insert(externalParty)
    .values({
      organizationId: input.organizationId,
      siteId: input.siteId ?? null,
      partyType: input.partyType,
      companyName: input.companyName,
      contactName: input.contactName ?? null,
      contactEmail: input.contactEmail ?? null,
      externalWorkerId: input.externalWorkerId,
      hrisSource: input.hrisSource ?? null,
      onboardedAt: new Date(),
    })
    .returning({ id: externalParty.id });

  await writeAuditLog(db, {
    organizationId: input.organizationId,
    actorUserId,
    action: "integration.hris_contractor_provision",
    entityType: "external_party",
    entityId: inserted!.id,
    payload: { integrationEventId: eventId, externalWorkerId: input.externalWorkerId },
  });

  return { externalPartyId: inserted!.id, created: true };
}
