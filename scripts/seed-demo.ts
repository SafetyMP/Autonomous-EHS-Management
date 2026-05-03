/**
 * Full demo bootstrap: Better Auth demo user, RBAC, sites, incidents, CAPA,
 * training, controlled documents, internal audit + finding.
 *
 * Prerequisites: DATABASE_URL, BETTER_AUTH_*, NEXT_PUBLIC_APP_URL (see .env.demo.example).
 *
 * Usage: npx tsx scripts/seed-demo.ts
 */
import type { Db } from "../src/server/db";
import { and, eq } from "drizzle-orm";
import {
  auditFinding,
  controlledDocument,
  correctiveAction,
  documentRevision,
  incident,
  internalAudit,
  site,
  trainingRecord,
} from "../src/server/db/schema";
import { demoPrefixConstant, demoTitleStartsWith } from "./lib/demo-scope";
import { loadEnvFiles } from "./lib/load-env";
import { maybeEnrichParagraph } from "./lib/openai-narrative";
import { ensureRbacForUser } from "./lib/seed-shared";

loadEnvFiles();

const DEMO_TITLE_PREFIX = demoPrefixConstant();
const DEMO_DOC_NUMBER = "DEMO-EHS-CD-001";
const SECOND_SITE_NAME = "North plant";

type IncidentSeed = {
  title: string;
  description: string;
  incidentType:
    | "injury"
    | "ill_health"
    | "near_miss"
    | "environmental"
    | "property_damage"
    | "other";
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "closed";
  daysAgo: number;
  investigationNotes?: string;
  rootCauseSummary?: string;
  immediateActions?: string;
};

type CapaSeed = {
  title: string;
  details: string;
  status:
    | "pending_approval"
    | "planned"
    | "in_progress"
    | "completed"
    | "verified";
  incidentTitle: string;
  dueDaysFromNow?: number;
  verificationNotes?: string;
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

const BASE_INCIDENTS: IncidentSeed[] = [
  {
    title: `${DEMO_TITLE_PREFIX}Near miss — forklift swing at loading dock`,
    description:
      "Spotter briefly stepped behind a staged pallet while a forklift was reversing. No contact: horn stopped the maneuver. Shift supervisor halted work for a 10-minute toolbox talk.",
    incidentType: "near_miss",
    severity: "medium",
    status: "closed",
    daysAgo: 52,
    investigationNotes:
      "Reviewed lift traffic plan; sight lines partially blocked by seasonal staging.",
    rootCauseSummary:
      "Pedestrian route overlapped reversing lane when pallets encroached on painted walkway.",
    immediateActions: "Barriers repositioned; spotter brief re-trained on zones.",
  },
  {
    title: `${DEMO_TITLE_PREFIX}Strain injury during valve rebuild`,
    description:
      "Mechanic reported sharp shoulder pain while torquing a seized bonnet bolt on an isolation valve. First aid applied; transported to occupational clinic.",
    incidentType: "injury",
    severity: "high",
    status: "closed",
    daysAgo: 118,
    investigationNotes:
      "Job was planned one-person; torque multiplier not staged at pad. Heat sleeves delayed grip adjustment.",
    rootCauseSummary:
      "Insufficient task planning for high-torque posture; tooling accessibility gap.",
    immediateActions: "Two-person assist required for Class-C bonnet work pending JHA update.",
  },
  {
    title: `${DEMO_TITLE_PREFIX}Oil sheen in storm channel after compressor pad washdown`,
    description:
      "Operator noticed rainbow sheen outside secondary containment after pad rinse. Boom pads deployed along channel mouth; notified environmental lead.",
    incidentType: "environmental",
    severity: "high",
    status: "investigating",
    daysAgo: 6,
    investigationNotes:
      "Sampling scheduled; washdown SOP references retired detergent SKU.",
    immediateActions: "Washdown paused on pad C; absorbent socks deployed.",
  },
  {
    title: `${DEMO_TITLE_PREFIX}Near miss — overhead crane tag line slip`,
    description:
      "Load tagged off-center; swing arc brought bundle within 3 ft of scaffolding leg. Banksman stopped lift; load grounded without strike.",
    incidentType: "near_miss",
    severity: "medium",
    status: "open",
    daysAgo: 4,
    immediateActions: "Lift paused pending tag attachment checklist revision.",
  },
  {
    title: `${DEMO_TITLE_PREFIX}Minor property damage — AGV nudge to tote stack`,
    description:
      "Autonomous tug mis-routed and clipped a blue poly tote column, damaging two empty totes. No personnel in fall zone.",
    incidentType: "property_damage",
    severity: "low",
    status: "closed",
    daysAgo: 203,
    rootCauseSummary:
      "Lane occupancy sensor calibration drift after floor resurfacing.",
    immediateActions: "AGV route re-mapped; QA sweep on occupancy thresholds.",
  },
  {
    title: `${DEMO_TITLE_PREFIX}Heat stress assessment — packaging line`,
    description:
      "Two temps reported dizziness during peak afternoon heat. Cool-down initiated; hydration station audit triggered.",
    incidentType: "ill_health",
    severity: "medium",
    status: "investigating",
    daysAgo: 11,
    investigationNotes:
      "WBGT loggers not yet installed on Line 4 mezzanine.",
    immediateActions: "Rotation schedule tightened; portable fans staged.",
  },
  {
    title: `${DEMO_TITLE_PREFIX}Confined space standby gap (pre-entry)`,
    description:
      "Pre-job verification found attendant briefly absent during atmospheric retest window on tank farm TK-12. Entry aborted; no entrants in space.",
    incidentType: "other",
    severity: "critical",
    status: "investigating",
    daysAgo: 2,
    investigationNotes:
      "Contractor and site permits cross-checked; clock sync on gas meters under review.",
    immediateActions: "Permit suspended for contractor group until re-brief.",
  },
  {
    title: `${DEMO_TITLE_PREFIX}Chemical splash — eyewash activation`,
    description:
      "Technician splashed dilute caustic while transferring to day tank. Eyewash ran 15 minutes per protocol; redness subsided; cleared to return next shift.",
    incidentType: "injury",
    severity: "medium",
    status: "closed",
    daysAgo: 34,
    rootCauseSummary:
      "Pump rated for different hose class; coupling released under back-pressure.",
    immediateActions: "Compatible whip hose kit issued; transfer SOP annotated.",
  },
];

const BASE_CAPAS: CapaSeed[] = [
  {
    title: `${DEMO_TITLE_PREFIX}Redesign dock pedestrian corridor with fixed barriers`,
    details:
      "Engineering change package for loading dock lanes 2–3; delineators and swing gates tied to forklift permit checklist.",
    status: "verified",
    incidentTitle: `${DEMO_TITLE_PREFIX}Near miss — forklift swing at loading dock`,
    dueDaysFromNow: -40,
    verificationNotes:
      "Post-change 90-day observation: zero repeat near-miss reports; traffic plan posted in three languages.",
  },
  {
    title: `${DEMO_TITLE_PREFIX}JHA and tooling kit for high-torque valve work`,
    details:
      "Standard job pack with torque multiplier, ergonomic brace points, and two-person sign-off for Class-C bonnet tasks.",
    status: "completed",
    incidentTitle: `${DEMO_TITLE_PREFIX}Strain injury during valve rebuild`,
    dueDaysFromNow: -20,
  },
  {
    title: `${DEMO_TITLE_PREFIX}Compressor pad washdown — chemical inventory alignment`,
    details:
      "Replace legacy detergent references in CMMS washdown SOP; bund volume verification and spill drill table-top.",
    status: "in_progress",
    incidentTitle: `${DEMO_TITLE_PREFIX}Oil sheen in storm channel after compressor pad washdown`,
    dueDaysFromNow: 21,
  },
  {
    title: `${DEMO_TITLE_PREFIX}Crane lift — banksman checklist v3`,
    details:
      "Require photo of tag geometry before hoist; add wind threshold gate tied to weather feed.",
    status: "planned",
    incidentTitle: `${DEMO_TITLE_PREFIX}Near miss — overhead crane tag line slip`,
    dueDaysFromNow: 14,
  },
  {
    title: `${DEMO_TITLE_PREFIX}AGV route QA after surface changes`,
    details:
      "Quarterly occupancy calibration with vendor; change control tied to facilities work orders.",
    status: "verified",
    incidentTitle: `${DEMO_TITLE_PREFIX}Minor property damage — AGV nudge to tote stack`,
    dueDaysFromNow: -90,
    verificationNotes: "Four quarters without repeat route drift incidents.",
  },
];

async function ensureDemoUserExists(): Promise<void> {
  const email = (process.env.DEMO_ADMIN_EMAIL ?? "demo.admin@example.com").toLowerCase();
  const password =
    process.env.DEMO_ADMIN_PASSWORD ?? "demo-admin-password-change-me";
  const name = process.env.DEMO_ADMIN_NAME ?? "Riley Chen";
  const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  const { db } = await import("../src/server/db");
  const { authUser } = await import("../src/server/db/schema");

  const [existing] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1);

  if (existing) {
    console.log(`Demo user already present: ${email}`);
    return;
  }

  const { auth } = await import("../src/server/auth");
  await auth.api.signUpEmail({
    body: { name, email, password },
    headers: new Headers({ origin }),
  });
  console.log(`Created demo user: ${email}`);
}

async function ensureSecondarySite(db: Db, orgId: string) {
  let [row] = await db
    .select()
    .from(site)
    .where(and(eq(site.organizationId, orgId), eq(site.name, SECOND_SITE_NAME)))
    .limit(1);

  if (!row) {
    [row] = await db
      .insert(site)
      .values({ organizationId: orgId, name: SECOND_SITE_NAME })
      .returning();
  }
  return row;
}

async function main() {
  await ensureDemoUserExists();

  const email = (
    process.env.DEMO_ADMIN_EMAIL ?? "demo.admin@example.com"
  ).toLowerCase();

  const { db } = await import("../src/server/db");

  const { orgId, siteId, userId } = await ensureRbacForUser(db, email);
  const northSite = await ensureSecondarySite(db, orgId);

  const [already] = await db
    .select({ id: incident.id })
    .from(incident)
    .where(
      and(eq(incident.organizationId, orgId), demoTitleStartsWith(incident.title)),
    )
    .limit(1);

  if (already) {
    console.log("Demo data already seeded; skipping inserts.");
    return;
  }

  const incidentIds = new Map<string, string>();

  for (const row of BASE_INCIDENTS) {
    const description = await maybeEnrichParagraph(row.description);
    const investigationNotes = row.investigationNotes
      ? await maybeEnrichParagraph(row.investigationNotes)
      : undefined;
    const rootCauseSummary = row.rootCauseSummary
      ? await maybeEnrichParagraph(row.rootCauseSummary)
      : undefined;
    const immediateActions = row.immediateActions
      ? await maybeEnrichParagraph(row.immediateActions)
      : undefined;

    const useSiteId = row.title.includes("packaging") ? northSite.id : siteId;

    const [ins] = await db
      .insert(incident)
      .values({
        organizationId: orgId,
        siteId: useSiteId,
        title: row.title,
        description,
        incidentType: row.incidentType,
        severity: row.severity,
        status: row.status,
        reportedByUserId: userId,
        investigationOwnerUserId: userId,
        occurredAt: daysAgo(row.daysAgo),
        investigationNotes,
        rootCauseSummary,
        immediateActions,
      })
      .returning({ id: incident.id });

    incidentIds.set(row.title, ins.id);
  }

  for (const c of BASE_CAPAS) {
    const incId = incidentIds.get(c.incidentTitle);
    if (!incId) {
      console.warn(`Skipping CAPA (incident not found): ${c.incidentTitle}`);
      continue;
    }

    const details = await maybeEnrichParagraph(c.details);
    const verificationNotes = c.verificationNotes
      ? await maybeEnrichParagraph(c.verificationNotes)
      : undefined;

    const due =
      c.dueDaysFromNow !== undefined
        ? c.dueDaysFromNow >= 0
          ? daysFromNow(c.dueDaysFromNow)
          : daysAgo(-c.dueDaysFromNow)
        : null;

    await db.insert(correctiveAction).values({
      organizationId: orgId,
      incidentId: incId,
      title: c.title,
      details,
      status: c.status,
      dueDate: due,
      ownerUserId: userId,
      verificationNotes,
    });
  }

  await db.insert(trainingRecord).values([
    {
      organizationId: orgId,
      traineeName: "Jordan Malik",
      userId,
      courseTitle: `${DEMO_TITLE_PREFIX}LOTO authorized employee refresher`,
      completedOn: daysAgo(21),
      expiresOn: daysFromNow(340),
      evidenceNote: "Instructor-led session; practical demo signed.",
    },
    {
      organizationId: orgId,
      traineeName: "Sam Rivera",
      courseTitle: `${DEMO_TITLE_PREFIX}Hot work permit coordinator`,
      completedOn: daysAgo(70),
      expiresOn: daysFromNow(295),
      evidenceNote: null,
    },
    {
      organizationId: orgId,
      traineeName: "Alex Park",
      userId,
      courseTitle: `${DEMO_TITLE_PREFIX}Spill response — North plant`,
      completedOn: daysAgo(5),
      expiresOn: null,
      evidenceNote: "Table-top plus practical on absorbent deployment.",
    },
  ]);

  const [doc] = await db
    .insert(controlledDocument)
    .values({
      organizationId: orgId,
      title: `${DEMO_TITLE_PREFIX}Hazard communication and chemical labeling`,
      documentNumber: DEMO_DOC_NUMBER,
      revision: "1.0",
      status: "approved",
      effectiveDate: daysAgo(180),
      approvedByUserId: userId,
      approvedAt: daysAgo(180),
    })
    .returning({ id: controlledDocument.id });

  await db.insert(documentRevision).values({
    documentId: doc.id,
    organizationId: orgId,
    revision: "1.1",
    title: `${DEMO_TITLE_PREFIX}Hazard communication and chemical labeling`,
    summary:
      "Aligned SDS access steps with CMMS links; added GHS pictogram quick-reference appendix.",
    status: "approved",
    effectiveDate: daysAgo(30),
    approvedByUserId: userId,
    approvedAt: daysAgo(14),
    isCurrent: true,
  });

  const [auditCapa] = await db
    .insert(correctiveAction)
    .values({
      organizationId: orgId,
      title: `${DEMO_TITLE_PREFIX}Internal audit CAPA — LOTO spot-check sampling`,
      details:
        "Increase monthly LOTO spot-check sample to 15% of active permits; dashboard metric for overdue verifications.",
      status: "in_progress",
      dueDate: daysFromNow(30),
      ownerUserId: userId,
    })
    .returning({ id: correctiveAction.id });

  const [isoAudit] = await db
    .insert(internalAudit)
    .values({
      organizationId: orgId,
      title: `${DEMO_TITLE_PREFIX}ISO 45001 internal audit — packaging & chemicals`,
      scope:
        "Sampling of Line 4 packaging, chemical decanting, and LOTO permit records for calendar Q2.",
      status: "completed",
      plannedDate: daysAgo(75),
      completedAt: daysAgo(14),
      leadAuditorUserId: userId,
    })
    .returning({ id: internalAudit.id });

  await db.insert(auditFinding).values({
    organizationId: orgId,
    internalAuditId: isoAudit.id,
    findingType: "minor_nc",
    title: `${DEMO_TITLE_PREFIX}LOTO spot-check coverage below internal target`,
    details:
      "Four months running below the 10% sample plan; root-cause tied to permit closure backlog in CMMS.",
    correctiveActionId: auditCapa.id,
  });

  console.log(
    `Demo seed complete. Sign in as ${email} (use DEMO_MODE quick login or password from env).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
