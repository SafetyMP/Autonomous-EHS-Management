import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  environmentalAspect,
  establishment,
  externalParty,
  hazard,
  membership,
  personSubject,
  site,
} from "@/server/db/schema";
import type { Db } from "@/server/db";

export async function assertSiteInOrg(
  db: Db,
  organizationId: string,
  siteId: string,
) {
  const [s] = await db
    .select()
    .from(site)
    .where(and(eq(site.id, siteId), eq(site.organizationId, organizationId)))
    .limit(1);
  if (!s) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Site does not belong to organization.",
    });
  }
}

export async function assertHazardInOrg(
  db: Db,
  organizationId: string,
  hazardId: string,
) {
  const [h] = await db
    .select()
    .from(hazard)
    .where(
      and(eq(hazard.id, hazardId), eq(hazard.organizationId, organizationId)),
    )
    .limit(1);
  if (!h) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Hazard not found in this organization.",
    });
  }
}

export async function assertAspectInOrg(
  db: Db,
  organizationId: string,
  aspectId: string,
) {
  const [a] = await db
    .select()
    .from(environmentalAspect)
    .where(
      and(
        eq(environmentalAspect.id, aspectId),
        eq(environmentalAspect.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!a) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Environmental aspect not found in this organization.",
    });
  }
}

export async function assertExternalPartyInOrg(
  db: Db,
  organizationId: string,
  partyId: string,
) {
  const [p] = await db
    .select()
    .from(externalParty)
    .where(
      and(
        eq(externalParty.id, partyId),
        eq(externalParty.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!p) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "External party not found in this organization.",
    });
  }
}

export async function assertEstablishmentInOrg(
  db: Db,
  organizationId: string,
  establishmentId: string,
) {
  const [e] = await db
    .select()
    .from(establishment)
    .where(
      and(
        eq(establishment.id, establishmentId),
        eq(establishment.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!e) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Establishment not found in this organization.",
    });
  }
}

export async function assertPersonSubjectInOrg(
  db: Db,
  organizationId: string,
  personSubjectId: string,
) {
  const [s] = await db
    .select()
    .from(personSubject)
    .where(
      and(
        eq(personSubject.id, personSubjectId),
        eq(personSubject.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!s) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Person subject not found in this organization.",
    });
  }
}

export async function assertOrgMemberUserId(
  db: Db,
  organizationId: string,
  userId: string,
) {
  const [m] = await db
    .select({ id: membership.id })
    .from(membership)
    .where(
      and(eq(membership.organizationId, organizationId), eq(membership.userId, userId)),
    )
    .limit(1);
  if (!m) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "User is not a member of this organization.",
    });
  }
}
