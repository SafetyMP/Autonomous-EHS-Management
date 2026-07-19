/**
 * Demo bootstrap: user + RBAC, multi-domain fixtures (`[Demo]` scope).
 * Safe to re-run: each domain skips when demo rows already exist.
 *
 * Prerequisites: DATABASE_URL, BETTER_AUTH_*, NEXT_PUBLIC_APP_URL (see .env.demo.example).
 *
 * Usage: npx tsx scripts/seed-demo.ts
 */
import type { Db } from "../src/server/db";
import { and, desc, eq, gte, like, or, sql } from "drizzle-orm";
import {
  approvalRequest,
  approvalStep,
  auditFinding,
  cbAuditFinding,
  certificationBodyAudit,
  chemicalHazardClassification,
  complianceObligation,
  contextIssue,
  controlledDocument,
  correctiveAction,
  cronJobRun,
  dataSubjectRequest,
  documentRevision,
  ehsEvidenceAttachment,
  emergencyDrill,
  emergencyScenario,
  environmentalAspect,
  environmentalImpact,
  environmentalMonitoringResult,
  environmentalRegulatoryPermit,
  environmentalRegulatoryPermitCondition,
  escalationEvent,
  establishment,
  establishmentMonthMetrics,
  establishmentYearMetrics,
  externalParty,
  externalPartyCredential,
  hazard,
  heatIllnessPreventionProgram,
  heatProgramControlCheck,
  incident,
  inspection,
  interestedParty,
  internalAudit,
  integrationConnectorMapping,
  integrationEvent,
  kpiDefinition,
  managementObjective,
  managementOfChange,
  managementReview,
  managementSystemScope,
  managementCertificate,
  measurementRecord,
  obligationAspectLink,
  obligationEvidenceLink,
  operationalWebhookEndpoint,
  organizationSetupStep,
  ragChunk,
  ragSource,
  regulatoryChemical,
  riskAssessment,
  riskAssessmentStep,
  safetyObservation,
  site,
  trainingRecord,
  workPermit,
  workRelatedInjuryIllnessRecord,
} from "../src/server/db/schema";
import { finalizeInvestigationBowTieForStore, finalizeInvestigationChronologyForStore, finalizeInvestigationCausalFactorsForStore } from "../src/lib/investigation/structuredInvestigation";
import { INTEGRATION_CONNECTOR_KEYS } from "../src/lib/integration/connectorKeys";
import { normalizeRcaFishboneForStore } from "../src/lib/rcaFishbone";
import { CRON_JOB_KEYS } from "../src/server/cron/recordCronRun";
import { demoPrefixConstant, demoTitleStartsWith } from "./lib/demo-scope";
import { loadEnvFiles } from "./lib/load-env";
import { maybeEnrichParagraph } from "./lib/openai-narrative";
import { ensureRbacForUser } from "./lib/seed-shared";
import { insertCapaApprovalSteps } from "../src/server/services/capaApprovalSteps";
import { insertEnvironmentalRegulatoryPermitApprovalRequestTx } from "../src/server/services/environmentalRegulatoryPermitApproval";
import { insertWorkPermitApprovalRequestTx } from "../src/server/services/workPermitApproval";

loadEnvFiles();

const DEMO_TITLE_PREFIX = demoPrefixConstant();
const DEMO_DOC_NUMBER = "DEMO-EHS-CD-001";
const SECOND_SITE_NAME = "North plant";

/** CAPA used for seeded approval inbox (demo admin is approver). */
const DEMO_CAPA_PENDING_APPROVAL_TITLE = `${DEMO_TITLE_PREFIX}Engineering scaffold change — corrective action`;

/** Permit pending approval (+ approval workflow). */
const DEMO_PERMIT_PENDING_TITLE = `${DEMO_TITLE_PREFIX}Hot work — north roof patch`;

const DEMO_STORMWATER_OBLIG_TITLE = `${DEMO_TITLE_PREFIX}Industrial stormwater permit — benchmark monitoring`;

const DEMO_INCIDENT_FORKLIFT = `${DEMO_TITLE_PREFIX}Near miss — forklift swing at loading dock`;
const DEMO_INCIDENT_STRAIN = `${DEMO_TITLE_PREFIX}Strain injury during valve rebuild`;
/** Packaging-line injury used as second OSHA recordable for TRI/driver demos (one WRI row per incident). */
const DEMO_INCIDENT_FALL_FROM_HEIGHT = `${DEMO_TITLE_PREFIX}Fall from height — packaging mezzanine`;

const DEMO_ENV_PERMIT_ACTIVE_TITLE = `${DEMO_TITLE_PREFIX}Demo discharge permit — Outfall 001-West`;
const DEMO_ENV_PERMIT_PENDING_TITLE = `${DEMO_TITLE_PREFIX}Demo air permit renewal — package boiler`;

const DEMO_RFC1123_SOURCE_TITLE = `${DEMO_TITLE_PREFIX}RAG — Hot work permit coordinator guidance`;

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

function buildDemoRcaPayload(title: string): {
  rcaFiveWhys: { why: string; answer: string }[];
  rcaFishbone: ReturnType<typeof normalizeRcaFishboneForStore>;
  investigationBowTie?: NonNullable<ReturnType<typeof finalizeInvestigationBowTieForStore>>;
  investigationChronology?: NonNullable<ReturnType<typeof finalizeInvestigationChronologyForStore>>;
} | null {
  if (title === DEMO_INCIDENT_FORKLIFT) {
    const bowTieInput = {
      topEvent: "Pedestrian-footprint overlapped forklift reversing arc at dock lane",
      threats: [
        {
          description: "Forklift reversing with partial sight-line obstruction",
          preventiveBarriers: [
            { description: "Horn signal before reverse", outcome: "effective" as const },
            { description: "Spotter station kept outside arc", outcome: "failed_degraded" as const },
          ],
        },
      ],
      consequences: [
        {
          description: "Struck-by or crush injury",
          mitigativeBarriers: [
            { description: "Supervisor stop-work authority", outcome: "effective" as const },
          ],
        },
      ],
      notes: "[Demo] Synthetic bow-tie — illustrative only.",
    };
    const chronologyIn = [
      {
        sortOrder: 0,
        occurredAt: daysAgo(52),
        description: "Peak freight: additional pallets staged at dock B apron",
      },
      {
        sortOrder: 1,
        occurredAt: daysAgo(52),
        description: "Spotter stepped behind staged pallet during reverse horn",
      },
      {
        sortOrder: 2,
        occurredAt: daysAgo(52),
        description: "Supervisor stopped lift; toolbox talk held same shift",
      },
    ];
    return {
      rcaFiveWhys: [
        {
          why: "Why was the pedestrian in the reversing arc?",
          answer: "The painted walkway narrowed where seasonal pallets encroached on the lane.",
        },
        {
          why: "Why did pallets encroach on the walkway?",
          answer: "Peak staging plan was not updated after the seasonal freight increase.",
        },
        {
          why: "Why was the staging plan stale?",
          answer: "Dock traffic review was awaiting facilities sign-off on revised floor marks.",
        },
      ],
      rcaFishbone: normalizeRcaFishboneForStore([
        { categoryId: "people", causes: ["Spotter focused on load alignment vs foot placement"] },
        { categoryId: "environment", causes: ["Seasonal pallet volume; narrow apron"] },
        { categoryId: "process", causes: ["Staging map not refreshed for Q4 profile"] },
        { categoryId: "equipment", causes: ["Backup alarm present; sight lines partial"] },
        { categoryId: "management", causes: ["Traffic plan review queued behind CMMS cutover"] },
      ]),
      investigationBowTie: finalizeInvestigationBowTieForStore(bowTieInput)!,
      investigationChronology: finalizeInvestigationChronologyForStore(chronologyIn)!,
    };
  }
  if (title === DEMO_INCIDENT_FALL_FROM_HEIGHT) {
    return {
      rcaFiveWhys: [
        {
          why: "Why did the technician lose secure footing on the service deck?",
          answer:
            "The grated walkway retained slippery residue after an overlapping solvent wipe-down.",
        },
        {
          why: "Why did solvent residue remain during cable-pull activity?",
          answer:
            "Housekeeping verification closed before the walking-working surface was confirmed dry.",
        },
        {
          why: "Why were trades overlapping without surface readiness?",
          answer:
            "Cable-pull schedule compression skipped the mezzanine traffic coordination checklist gate.",
        },
      ],
      rcaFishbone: normalizeRcaFishboneForStore([
        {
          categoryId: "environment",
          causes: ["Wet/slippery grated deck during simultaneous solvent housekeeping"],
        },
        {
          categoryId: "equipment",
          causes: ["Temporary toe-board gap during cable routing without alternate guarding"],
        },
        {
          categoryId: "process",
          causes: ["Dry-verification step missing between housekeeping close-out and mechanical assist"],
        },
        {
          categoryId: "people",
          causes: ["Foot placement toward unmarked deck edge during load communication"],
        },
      ]),
    };
  }
  if (title === DEMO_INCIDENT_STRAIN) {
    return {
      rcaFiveWhys: [
        {
          why: "Why did the mechanic use excess torso torque?",
          answer: "Torque multiplier and second tool kit were not at the pad.",
        },
        {
          why: "Why was tooling missing at the pad?",
          answer: "Job ticket did not flag Class-C bonnet as high-torque posture work.",
        },
        {
          why: "Why was the JHA incomplete for bonnet class?",
          answer: "CMMS template still referenced the pre-classification valve roster.",
        },
      ],
      rcaFishbone: normalizeRcaFishboneForStore([
        { categoryId: "people", causes: ["One-person habit under time pressure"] },
        { categoryId: "process", causes: ["JHA template gap for Class-C bonnet"] },
        { categoryId: "equipment", causes: ["Torque multiplier not kitted to pad"] },
        { categoryId: "materials", causes: ["Heat sleeve reduced effective grip"] },
      ]),
    };
  }
  return null;
}

async function ensureDemoIncidentsHaveRca(db: Db, orgId: string, incidentIds: Map<string, string>) {
  for (const [tit, id] of incidentIds) {
    const payload = buildDemoRcaPayload(tit);
    if (!payload) continue;
    const [row] = await db
      .select({ id: incident.id, rcaFiveWhys: incident.rcaFiveWhys })
      .from(incident)
      .where(and(eq(incident.id, id), eq(incident.organizationId, orgId)))
      .limit(1);
    if (row && (row.rcaFiveWhys == null || (Array.isArray(row.rcaFiveWhys) && row.rcaFiveWhys.length === 0))) {
      await db
        .update(incident)
        .set({
          rcaFiveWhys: payload.rcaFiveWhys,
          rcaFishbone: payload.rcaFishbone,
          ...(payload.investigationBowTie !== undefined
            ? { investigationBowTie: payload.investigationBowTie }
            : {}),
          ...(payload.investigationChronology !== undefined
            ? { investigationChronology: payload.investigationChronology }
            : {}),
        })
        .where(eq(incident.id, id));
    }
  }
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
    title: DEMO_INCIDENT_STRAIN,
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
    title: DEMO_INCIDENT_FALL_FROM_HEIGHT,
    description:
      "Maintenance technician stepped onto a grated service deck during a cable-pull assist; slippery residue reduced traction and footing slid toward a temporary toe-board gap created for routing. Fell roughly 4 ft to the staging platform; knee struck the edge. Occupational clinic evaluated same day with restricted-duty recommendation.",
    incidentType: "injury",
    severity: "high",
    status: "closed",
    daysAgo: 72,
    investigationNotes:
      "Housekeeping ticket showed solvent wipe completion stamped ahead of independent deck dryness verification.",
    rootCauseSummary:
      "Overlapping housekeeping and mechanical assist without a dry-working-surface gate; temporary guarding gap not visibly bounded.",
    immediateActions:
      "Deck washed/dried and inspected; cable gap barrier restored; mezzanine traffic plan posted for concurrent trades.",
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
    incidentTitle: DEMO_INCIDENT_STRAIN,
    dueDaysFromNow: -20,
  },
  {
    title: `${DEMO_TITLE_PREFIX}Mezzanine — dry deck verification before mechanical assists`,
    details:
      "Require secondary dryness sign-off after solvent housekeeping on grated decks; cordon remains until checklist closed.",
    status: "in_progress",
    incidentTitle: DEMO_INCIDENT_FALL_FROM_HEIGHT,
    dueDaysFromNow: 12,
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

async function insertDemoIncident(
  db: Db,
  ctx: { orgId: string; siteId: string; northSiteId: string; userId: string },
  row: IncidentSeed,
): Promise<string> {
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

  const useSiteId = row.title.includes("packaging") ? ctx.northSiteId : ctx.siteId;

  const rca = buildDemoRcaPayload(row.title);

  const [ins] = await db
    .insert(incident)
    .values({
      organizationId: ctx.orgId,
      siteId: useSiteId,
      title: row.title,
      description,
      incidentType: row.incidentType,
      severity: row.severity,
      status: row.status,
      reportedByUserId: ctx.userId,
      investigationOwnerUserId: ctx.userId,
      occurredAt: daysAgo(row.daysAgo),
      investigationNotes,
      rootCauseSummary,
      immediateActions,
      ...(rca
        ? {
            rcaFiveWhys: rca.rcaFiveWhys,
            rcaFishbone: rca.rcaFishbone,
            ...(rca.investigationBowTie ? { investigationBowTie: rca.investigationBowTie } : {}),
            ...(rca.investigationChronology
              ? { investigationChronology: rca.investigationChronology }
              : {}),
          }
        : {}),
    })
    .returning({ id: incident.id });

  if (!ins) {
    throw new Error(`Failed to insert demo incident: ${row.title}`);
  }
  return ins.id;
}

/** Retrofit older demo orgs created before the fall-from-height fixture existed. */
async function ensureDemoFallIncidentExists(
  db: Db,
  ctx: { orgId: string; siteId: string; northSiteId: string; userId: string },
  incidentIds: Map<string, string>,
): Promise<void> {
  const title = DEMO_INCIDENT_FALL_FROM_HEIGHT;
  if (incidentIds.has(title)) {
    console.log(`Demo fall-from-height incident already linked (${title}).`);
    return;
  }

  const [existing] = await db
    .select({ id: incident.id })
    .from(incident)
    .where(and(eq(incident.organizationId, ctx.orgId), eq(incident.title, title)))
    .limit(1);

  if (existing) {
    incidentIds.set(title, existing.id);
    console.log(`Demo fall-from-height incident already in DB (${title}).`);
    return;
  }

  const row = BASE_INCIDENTS.find((r) => r.title === title);
  if (!row) return;

  const id = await insertDemoIncident(db, ctx, row);
  incidentIds.set(title, id);
  console.log(`Seeded demo incident (retrofit): ${title}`);
}

async function seedIncidentsCapasTrainingDocsAudit(
  db: Db,
  ctx: {
    orgId: string;
    siteId: string;
    northSiteId: string;
    userId: string;
  },
): Promise<{ incidentIds: Map<string, string> } | null> {
  const [hasIncidents] = await db
    .select({ id: incident.id })
    .from(incident)
    .where(and(eq(incident.organizationId, ctx.orgId), demoTitleStartsWith(incident.title)))
    .limit(1);

  if (hasIncidents) {
    console.log("Demo incidents/CAPA/documents/training slice already present.");
    const rows = await db
      .select({ id: incident.id, title: incident.title })
      .from(incident)
      .where(and(eq(incident.organizationId, ctx.orgId), demoTitleStartsWith(incident.title)));
    const incidentIds = new Map(rows.map((r) => [r.title!, r.id] as const));
    return { incidentIds };
  }

  const incidentIds = new Map<string, string>();

  for (const row of BASE_INCIDENTS) {
    const id = await insertDemoIncident(db, ctx, row);
    incidentIds.set(row.title, id);
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
      organizationId: ctx.orgId,
      incidentId: incId,
      title: c.title,
      details,
      status: c.status,
      dueDate: due,
      ownerUserId: ctx.userId,
      verificationNotes,
    });
  }

  await db.insert(trainingRecord).values([
    {
      organizationId: ctx.orgId,
      traineeName: "Jordan Malik",
      userId: ctx.userId,
      courseTitle: `${DEMO_TITLE_PREFIX}LOTO authorized employee refresher`,
      completedOn: daysAgo(21),
      expiresOn: daysFromNow(18),
      evidenceNote: "Instructor-led session; practical demo signed.",
    },
    {
      organizationId: ctx.orgId,
      traineeName: "Sam Rivera",
      courseTitle: `${DEMO_TITLE_PREFIX}Hot work permit coordinator`,
      completedOn: daysAgo(70),
      expiresOn: daysFromNow(295),
      evidenceNote: null,
    },
    {
      organizationId: ctx.orgId,
      traineeName: "Alex Park",
      userId: ctx.userId,
      courseTitle: `${DEMO_TITLE_PREFIX}Spill response — North plant`,
      completedOn: daysAgo(5),
      expiresOn: null,
      evidenceNote: "Table-top plus practical on absorbent deployment.",
    },
  ]);

  const [doc] = await db
    .insert(controlledDocument)
    .values({
      organizationId: ctx.orgId,
      title: `${DEMO_TITLE_PREFIX}Hazard communication and chemical labeling`,
      documentNumber: DEMO_DOC_NUMBER,
      revision: "1.0",
      status: "approved",
      effectiveDate: daysAgo(180),
      approvedByUserId: ctx.userId,
      approvedAt: daysAgo(180),
    })
    .returning({ id: controlledDocument.id });

  await db.insert(documentRevision).values({
    documentId: doc.id,
    organizationId: ctx.orgId,
    revision: "1.1",
    title: `${DEMO_TITLE_PREFIX}Hazard communication and chemical labeling`,
    summary:
      "Aligned SDS access steps with CMMS links; added GHS pictogram quick-reference appendix.",
    status: "approved",
    effectiveDate: daysAgo(30),
    approvedByUserId: ctx.userId,
    approvedAt: daysAgo(14),
    isCurrent: true,
  });

  const [auditCapa] = await db
    .insert(correctiveAction)
    .values({
      organizationId: ctx.orgId,
      title: `${DEMO_TITLE_PREFIX}Internal audit CAPA — LOTO spot-check sampling`,
      details:
        "Increase monthly LOTO spot-check sample to 15% of active permits; dashboard metric for overdue verifications.",
      status: "in_progress",
      dueDate: daysFromNow(30),
      ownerUserId: ctx.userId,
    })
    .returning({ id: correctiveAction.id });

  const [isoAudit] = await db
    .insert(internalAudit)
    .values({
      organizationId: ctx.orgId,
      title: `${DEMO_TITLE_PREFIX}ISO 45001 internal audit — packaging & chemicals`,
      scope:
        "Sampling of Line 4 packaging, chemical decanting, and LOTO permit records for calendar Q2.",
      status: "completed",
      plannedDate: daysAgo(75),
      completedAt: daysAgo(14),
      leadAuditorUserId: ctx.userId,
    })
    .returning({ id: internalAudit.id });

  await db.insert(auditFinding).values({
    organizationId: ctx.orgId,
    internalAuditId: isoAudit.id,
    findingType: "minor_nc",
    title: `${DEMO_TITLE_PREFIX}LOTO spot-check coverage below internal target`,
    details:
      "Four months running below the 10% sample plan; root-cause tied to permit closure backlog in CMMS.",
    correctiveActionId: auditCapa.id,
  });

  console.log(
    `Seeded core demo: incidents (${BASE_INCIDENTS.length}), CAPAs, training, controlled document, internal audit.`,
  );
  return { incidentIds };
}

async function lookupCapaIdByTitle(
  db: Db,
  orgId: string,
  title: string,
): Promise<string | undefined> {
  const [row] = await db
    .select({ id: correctiveAction.id })
    .from(correctiveAction)
    .where(and(eq(correctiveAction.organizationId, orgId), eq(correctiveAction.title, title)))
    .limit(1);
  return row?.id;
}

async function seedObservations(
  db: Db,
  ctx: { orgId: string; siteId: string; northSiteId: string; userId: string },
): Promise<void> {
  const [exists] = await db
    .select({ id: safetyObservation.id })
    .from(safetyObservation)
    .where(
      and(
        eq(safetyObservation.organizationId, ctx.orgId),
        demoTitleStartsWith(safetyObservation.summary),
      ),
    )
    .limit(1);
  if (exists) {
    console.log("Demo observations already present.");
    return;
  }

  const dockCapa = await lookupCapaIdByTitle(
    db,
    ctx.orgId,
    `${DEMO_TITLE_PREFIX}Redesign dock pedestrian corridor with fixed barriers`,
  );

  await db.insert(safetyObservation).values([
    {
      organizationId: ctx.orgId,
      siteId: ctx.siteId,
      observedAt: daysAgo(2),
      category: "positive_behavior",
      severity: "low",
      summary: `${DEMO_TITLE_PREFIX}Spotter call-out prevented line-of-truck conflict`,
      details: "Team used standard hand signal; lift paused until lane cleared.",
      status: "closed",
      reporterUserId: ctx.userId,
    },
    {
      organizationId: ctx.orgId,
      siteId: ctx.northSiteId,
      observedAt: daysAgo(5),
      category: "unsafe_condition",
      severity: "medium",
      summary: `${DEMO_TITLE_PREFIX}Blocked eyewash access near paint mix`,
      details: "Pallet partially obstructed path; tagged and cleared same shift.",
      status: "acknowledged",
      reporterUserId: ctx.userId,
      followUpDueAt: daysAgo(1),
      assigneeUserId: ctx.userId,
      linkedCorrectiveActionId: dockCapa ?? null,
    },
    {
      organizationId: ctx.orgId,
      siteId: ctx.siteId,
      observedAt: daysAgo(1),
      category: "at_risk_behavior",
      severity: "high",
      summary: `${DEMO_TITLE_PREFIX}Bypass of interlock during jam clear attempt`,
      details: "Operator reached without LOTO; stopped by supervisor; coach scheduled.",
      status: "open",
      reporterUserId: ctx.userId,
      followUpDueAt: daysFromNow(3),
      assigneeUserId: ctx.userId,
    },
  ]);
  console.log("Seeded safety observations.");
}

async function seedInspections(
  db: Db,
  ctx: { orgId: string; siteId: string; northSiteId: string; userId: string },
): Promise<void> {
  const [exists] = await db
    .select({ id: inspection.id })
    .from(inspection)
    .where(and(eq(inspection.organizationId, ctx.orgId), demoTitleStartsWith(inspection.title)))
    .limit(1);
  if (exists) {
    console.log("Demo inspections already present.");
    return;
  }

  await db.insert(inspection).values([
    {
      organizationId: ctx.orgId,
      siteId: ctx.siteId,
      title: `${DEMO_TITLE_PREFIX}Weekly fire extinguisher corridor sweep`,
      inspectionType: "routine",
      status: "scheduled",
      scheduledAt: daysFromNow(2),
      leadUserId: ctx.userId,
      notes: "Check tamper seals and obstruction radius.",
    },
    {
      organizationId: ctx.orgId,
      siteId: ctx.northSiteId,
      title: `${DEMO_TITLE_PREFIX}Quarterly forklift pre-use audit`,
      inspectionType: "regulatory",
      status: "in_progress",
      scheduledAt: daysAgo(1),
      leadUserId: ctx.userId,
      notes: "Sampling Line 4 reach trucks.",
    },
    {
      organizationId: ctx.orgId,
      siteId: ctx.siteId,
      title: `${DEMO_TITLE_PREFIX}Pre-job crane lift inspection — bays 12–13`,
      inspectionType: "pre_job",
      status: "completed",
      scheduledAt: daysAgo(8),
      completedAt: daysAgo(8),
      leadUserId: ctx.userId,
      notes: "Tagged equipment OK; winds below limit.",
    },
  ]);
  console.log("Seeded inspections.");
}

async function seedPermits(
  db: Db,
  ctx: { orgId: string; siteId: string; userId: string },
): Promise<{ pendingPermitId: string } | undefined> {
  const [exists] = await db
    .select({ id: workPermit.id })
    .from(workPermit)
    .where(and(eq(workPermit.organizationId, ctx.orgId), demoTitleStartsWith(workPermit.title)))
    .limit(1);
  if (exists) {
    console.log("Demo work permits already present.");
    const [pending] = await db
      .select({ id: workPermit.id })
      .from(workPermit)
      .where(and(eq(workPermit.organizationId, ctx.orgId), eq(workPermit.title, DEMO_PERMIT_PENDING_TITLE)))
      .limit(1);
    return pending ? { pendingPermitId: pending.id } : undefined;
  }

  await db.insert(workPermit).values([
    {
      organizationId: ctx.orgId,
      siteId: ctx.siteId,
      title: `${DEMO_TITLE_PREFIX}Confined space — tank TK-09 internal coating`,
      permitType: "confined_space",
      status: "draft",
      requesterUserId: ctx.userId,
      validFrom: daysFromNow(3),
      validTo: daysFromNow(5),
      workSummary: "Internal recoating after cleaning verification; attendant roster attached to paper pack.",
      hazardsControls: "Atmospheric monitoring; forced air; harness and tripod staged.",
    },
    {
      organizationId: ctx.orgId,
      siteId: ctx.siteId,
      title: DEMO_PERMIT_PENDING_TITLE,
      permitType: "hot_work",
      status: "pending_approval",
      requesterUserId: ctx.userId,
      validFrom: daysFromNow(7),
      validTo: daysFromNow(7),
      workSummary:
        "Patch galvanized roof seam above packaging mezzanine; fire watch and extinguisher within 35 ft.",
      hazardsControls: "Spark containment curtain; extinguishers; combustibles relocated 35 ft radius.",
    },
    {
      organizationId: ctx.orgId,
      siteId: ctx.siteId,
      title: `${DEMO_TITLE_PREFIX}Work at height — mezzanine handrail weld repair`,
      permitType: "work_at_height",
      status: "active",
      requesterUserId: ctx.userId,
      validFrom: daysAgo(1),
      validTo: daysFromNow(9),
      workSummary:
        "Certified contractor replacing two guardrail sections; anchor points inspected prior to start.",
      hazardsControls: "100% tie-off; tool lanyards; barricaded drop zone.",
      approvedByUserId: ctx.userId,
      approvedAt: daysAgo(1),
    },
    {
      organizationId: ctx.orgId,
      siteId: ctx.siteId,
      title: `${DEMO_TITLE_PREFIX}Hot work — tank farm valve replace (completed)`,
      permitType: "hot_work",
      status: "completed",
      requesterUserId: ctx.userId,
      validFrom: daysAgo(30),
      validTo: daysAgo(30),
      workSummary:
        "Valve cartridge replacement completed; PT passed; permit closed same shift.",
      hazardsControls: "Gas testing Q15; fire watch roster signed.",
      approvedByUserId: ctx.userId,
      approvedAt: daysAgo(31),
      completedAt: daysAgo(30),
    },
  ]);

  const [pendingPermitRow] = await db
    .select({ id: workPermit.id })
    .from(workPermit)
    .where(and(eq(workPermit.organizationId, ctx.orgId), eq(workPermit.title, DEMO_PERMIT_PENDING_TITLE)))
    .limit(1);

  console.log("Seeded work permits.");
  return pendingPermitRow ? { pendingPermitId: pendingPermitRow.id } : undefined;
}

async function seedCapaApprovalInbox(db: Db, ctx: { orgId: string; userId: string }): Promise<void> {
  let capaId = await lookupCapaIdByTitle(db, ctx.orgId, DEMO_CAPA_PENDING_APPROVAL_TITLE);
  if (!capaId) {
    const [inserted] = await db
      .insert(correctiveAction)
      .values({
        organizationId: ctx.orgId,
        incidentId: null,
        title: DEMO_CAPA_PENDING_APPROVAL_TITLE,
        details:
          "Structural engineering requested guardrail weld repair at mezzanine; needs EHS authorization before mobilization.",
        status: "pending_approval",
        dueDate: daysFromNow(21),
        ownerUserId: ctx.userId,
      })
      .returning({ id: correctiveAction.id });
    capaId = inserted!.id;
  }

  const [openForCapa] = await db
    .select({ id: approvalRequest.id })
    .from(approvalRequest)
    .where(
      and(
        eq(approvalRequest.organizationId, ctx.orgId),
        eq(approvalRequest.entityType, "capa"),
        eq(approvalRequest.entityId, capaId),
        eq(approvalRequest.status, "open"),
      ),
    )
    .limit(1);

  if (openForCapa) {
    console.log("Demo CAPA approval request already present.");
    return;
  }

  await db.transaction(async (tx) => {
    const [req] = await tx
      .insert(approvalRequest)
      .values({
        organizationId: ctx.orgId,
        entityType: "capa",
        entityId: capaId,
        status: "open",
        createdByUserId: ctx.userId,
      })
      .returning();
    if (!req) {
      throw new Error("Failed demo CAPA approval_request insert.");
    }
    await insertCapaApprovalSteps(tx, {
      organizationId: ctx.orgId,
      requestId: req.id,
      correctiveActionId: capaId,
      approverUserIds: [ctx.userId],
      actorUserId: ctx.userId,
      slaDaysPerStep: 5,
    });
  });
  console.log("Seeded CAPA approval inbox (pending for demo admin).");
}

async function seedPermitApprovalInbox(
  db: Db,
  ctx: { orgId: string; userId: string },
  pendingPermitId: string,
): Promise<void> {
  const [openWp] = await db
    .select({ id: approvalRequest.id })
    .from(approvalRequest)
    .where(
      and(
        eq(approvalRequest.organizationId, ctx.orgId),
        eq(approvalRequest.entityType, "work_permit"),
        eq(approvalRequest.entityId, pendingPermitId),
        eq(approvalRequest.status, "open"),
      ),
    )
    .limit(1);
  if (openWp) {
    console.log("Demo work permit approval request already present.");
    return;
  }

  await db.transaction(async (tx) => {
    await insertWorkPermitApprovalRequestTx(tx, {
      organizationId: ctx.orgId,
      workPermitId: pendingPermitId,
      approverUserIds: [ctx.userId],
      actorUserId: ctx.userId,
      slaDaysPerStep: 3,
    });
  });
  console.log("Seeded work permit approval inbox (pending for demo admin).");
}

async function seedTasksGovernanceMetrics(
  db: Db,
  ctx: { orgId: string; siteId: string; userId: string },
  incidentIds: Map<string, string>,
): Promise<void> {
  const overdueOblTitle = `${DEMO_TITLE_PREFIX}Annual air permit compliance certification review`;
  const [hasObl] = await db
    .select({ id: complianceObligation.id })
    .from(complianceObligation)
    .where(and(eq(complianceObligation.organizationId, ctx.orgId), eq(complianceObligation.title, overdueOblTitle)))
    .limit(1);

  if (!hasObl) {
    await db.insert(complianceObligation).values({
      organizationId: ctx.orgId,
      title: overdueOblTitle,
      requirementType: "environmental_permit",
      referenceCode: "STATE-AIR-QTR-ALT",
      jurisdiction: "Demonstration jurisdiction only",
      applicabilityNotes:
        "Synthetic obligation for Tasks hub overdue sample — not regulatory advice.",
      ownerUserId: ctx.userId,
      applicableSiteIds: [ctx.siteId],
      nextReviewDue: daysAgo(21),
    });
    console.log("Seeded overdue compliance obligation (Tasks hub).");
  }

  const mrSummary = `${DEMO_TITLE_PREFIX}Quarterly management review — safety & environment`;
  const [hasMr] = await db
    .select({ id: managementReview.id })
    .from(managementReview)
    .where(
      and(
        eq(managementReview.organizationId, ctx.orgId),
        demoTitleStartsWith(managementReview.summary),
      ),
    )
    .limit(1);

  if (!hasMr) {
    await db.insert(managementReview).values({
      organizationId: ctx.orgId,
      reviewDate: daysAgo(95),
      summary: mrSummary,
      actionItems:
        "Accelerate heat-stress controls on Line 4; confirm stormwater sampling vendor scope.",
      nextReviewDue: daysAgo(10),
    });
    console.log("Seeded overdue management review (Tasks hub).");
  }

  const strainIncidentId = incidentIds.get(DEMO_INCIDENT_STRAIN);
  const fallIncidentId = incidentIds.get(DEMO_INCIDENT_FALL_FROM_HEIGHT);

  const [existingWriStrain] = strainIncidentId
    ? await db
        .select({ id: workRelatedInjuryIllnessRecord.id })
        .from(workRelatedInjuryIllnessRecord)
        .where(eq(workRelatedInjuryIllnessRecord.incidentId, strainIncidentId))
        .limit(1)
    : [undefined];

  const [existingWriFall] = fallIncidentId
    ? await db
        .select({ id: workRelatedInjuryIllnessRecord.id })
        .from(workRelatedInjuryIllnessRecord)
        .where(eq(workRelatedInjuryIllnessRecord.incidentId, fallIncidentId))
        .limit(1)
    : [undefined];

  const estName = `${DEMO_TITLE_PREFIX}Main site establishment (TRI sample)`;
  let demoEstablishmentId: string | undefined;

  const anchorIncidentId = strainIncidentId ?? fallIncidentId;
  if (anchorIncidentId) {
    const [estRow] = await db
      .select({ id: establishment.id })
      .from(establishment)
      .where(and(eq(establishment.organizationId, ctx.orgId), eq(establishment.name, estName)))
      .limit(1);

    if (estRow) {
      demoEstablishmentId = estRow.id;
    } else if (!existingWriStrain && !existingWriFall) {
      const [est] = await db
        .insert(establishment)
        .values({
          organizationId: ctx.orgId,
          siteId: ctx.siteId,
          name: estName,
          city: "Demo City",
          region: "DC",
          country: "US",
          naicsCode: "325998",
        })
        .returning({ id: establishment.id });
      demoEstablishmentId = est!.id;
    } else {
      const probeId = strainIncidentId ?? fallIncidentId!;
      const [fromWri] = await db
        .select({ establishmentId: workRelatedInjuryIllnessRecord.establishmentId })
        .from(workRelatedInjuryIllnessRecord)
        .where(eq(workRelatedInjuryIllnessRecord.incidentId, probeId))
        .limit(1);
      demoEstablishmentId = fromWri?.establishmentId ?? undefined;
    }
  }

  const needSeedEstablishmentSlice =
    demoEstablishmentId &&
    ((!existingWriStrain && !!strainIncidentId) || (!existingWriFall && !!fallIncidentId));

  if (needSeedEstablishmentSlice) {
    const establishmentId = demoEstablishmentId!;
    const year = new Date().getUTCFullYear();
    const [hasYear] = await db
      .select({ id: establishmentYearMetrics.id })
      .from(establishmentYearMetrics)
      .where(
        and(
          eq(establishmentYearMetrics.establishmentId, establishmentId),
          eq(establishmentYearMetrics.calendarYear, year),
        ),
      )
      .limit(1);

    if (!hasYear) {
      await db.insert(establishmentYearMetrics).values({
        establishmentId,
        calendarYear: year,
        avgEmployees: 140,
        totalHoursWorked: 285_000,
      });
    }

    let seededAnyWri = false;
    if (!existingWriStrain && strainIncidentId) {
      await db.insert(workRelatedInjuryIllnessRecord).values({
        organizationId: ctx.orgId,
        incidentId: strainIncidentId,
        establishmentId,
        oshaRecordable: true,
        recordableClassification: "days_away",
        recordkeepingFramework: "federal_29_cfr_1904",
        determinationStatus: "determined",
        classificationRationale:
          "Demo-only OSHA sidecar: days away per clinic direction (synthetic).",
        workRelatedRationale:
          "Injury occurred during employer-directed valve maintenance (demonstration data).",
        injuryIllnessCategory: "injury",
        daysAway: 1,
        privacyCase: false,
        determinedAt: daysAgo(110),
        determinedByUserId: ctx.userId,
      });
      seededAnyWri = true;
    }

    if (!existingWriFall && fallIncidentId) {
      await db.insert(workRelatedInjuryIllnessRecord).values({
        organizationId: ctx.orgId,
        incidentId: fallIncidentId,
        establishmentId,
        oshaRecordable: true,
        recordableClassification: "job_transfer_restriction",
        recordkeepingFramework: "federal_29_cfr_1904",
        determinationStatus: "determined",
        classificationRationale:
          "Demo-only OSHA sidecar: restricted duty after fall — knee evaluation (synthetic).",
        workRelatedRationale:
          "Fall occurred during employer-directed cable assist on packaging mezzanine (demonstration data).",
        injuryIllnessCategory: "injury",
        daysAway: 0,
        daysRestricted: 7,
        privacyCase: false,
        determinedAt: daysAgo(68),
        determinedByUserId: ctx.userId,
      });
      seededAnyWri = true;
    }

    if (seededAnyWri) {
      console.log(`Seeded establishment + year metrics + OSHA sidecar(s) for TRI-style demos (${year}).`);
    }
  }

  if (demoEstablishmentId) {
    const establishmentId = demoEstablishmentId;
    const year = new Date().getUTCFullYear();

    /*
     * Incidence-rate demo (TRIR):
     * - Two federal recordables (strain + fall from height) with occurredAt in the current UTC calendar year.
     * - Partial monthly hours Jan–Mar only: 20k + 20k + 20k = 60,000 → TRIR ≈ (2×200,000)/60,000 ≈ 6.67.
     * - Delete `establishment_month_metrics` for this establishment+year (or save twelve months covering full annual hours)
     *   to fall back to annual total_hours_worked (285,000) → TRIR ≈ (2×200,000)/285,000 ≈ 1.40.
     */
    const [anyMonth] = await db
      .select({ id: establishmentMonthMetrics.id })
      .from(establishmentMonthMetrics)
      .where(
        and(
          eq(establishmentMonthMetrics.establishmentId, establishmentId),
          eq(establishmentMonthMetrics.calendarYear, year),
        ),
      )
      .limit(1);

    if (!anyMonth) {
      await db.insert(establishmentMonthMetrics).values([
        { establishmentId, calendarYear: year, calendarMonth: 1, hoursWorked: 20_000 },
        { establishmentId, calendarYear: year, calendarMonth: 2, hoursWorked: 20_000 },
        { establishmentId, calendarYear: year, calendarMonth: 3, hoursWorked: 20_000 },
      ]);
      console.log(
        "Seeded partial monthly hours for incidence-rate contrast (see comment above this insert).",
      );
    }

    if (strainIncidentId) {
      await db
        .update(incident)
        .set({
          investigationCausalFactors: finalizeInvestigationCausalFactorsForStore([
            {
              summary: "Torque tooling not pre-staged at pad",
              category: "procedural",
              barriersFailed: ["JHA verification step"],
            },
            {
              summary: "Single-worker habit under backlog pressure",
              category: "human",
              barriersFailed: [],
            },
          ]),
          contributingFactors: ["Under-planned mechanical task", "Line backlog pressure"],
        })
        .where(eq(incident.id, strainIncidentId));
    }

    if (fallIncidentId) {
      await db
        .update(incident)
        .set({
          investigationCausalFactors: finalizeInvestigationCausalFactorsForStore([
            {
              summary: "Grated deck not verified dry before mechanical assist resumed",
              category: "procedural",
              barriersFailed: ["Post-housekeeping surface readiness check"],
            },
            {
              summary: "Temporary toe-board opening left without alternate guarding during cable pull",
              category: "equipment",
              barriersFailed: ["Barrier continuity verification"],
            },
          ]),
          contributingFactors: ["Overlapping trades on mezzanine", "Cable-pull schedule compression"],
        })
        .where(eq(incident.id, fallIncidentId));
    }
  }
}

async function seedEnvironmentPlanningContext(
  db: Db,
  ctx: { orgId: string; siteId: string; northSiteId: string; userId: string },
): Promise<void> {
  const [hasScope] = await db
    .select({ id: managementSystemScope.id })
    .from(managementSystemScope)
    .where(and(eq(managementSystemScope.organizationId, ctx.orgId), demoTitleStartsWith(managementSystemScope.statement)))
    .limit(1);

  let scopeId: string | undefined;
  if (!hasScope) {
    const [s] = await db
      .insert(managementSystemScope)
      .values({
        organizationId: ctx.orgId,
        statement: `${DEMO_TITLE_PREFIX}IMS scope covers main and north plants plus satellite warehouse operations for fabricated goods (demo narrative).`,
        coveredSiteIds: [ctx.siteId, ctx.northSiteId],
      })
      .returning({ id: managementSystemScope.id });
    scopeId = s!.id;
    console.log("Seeded management system scope.");
  } else {
    scopeId = hasScope.id;
  }

  const [issue] = await db
    .select({ id: contextIssue.id })
    .from(contextIssue)
    .where(and(eq(contextIssue.organizationId, ctx.orgId), demoTitleStartsWith(contextIssue.description)))
    .limit(1);
  if (!issue) {
    await db.insert(contextIssue).values({
      organizationId: ctx.orgId,
      kind: "internal",
      category: "Demo — workforce profile",
      description: `${DEMO_TITLE_PREFIX}Seasonal influx of contractors increases induction load on Q3 packaging peaks.`,
      reviewDue: daysFromNow(120),
    });
    console.log("Seeded context issue.");
  }

  const [ipartyRow] = await db
    .select({ id: interestedParty.id })
    .from(interestedParty)
    .where(and(eq(interestedParty.organizationId, ctx.orgId), demoTitleStartsWith(interestedParty.name)))
    .limit(1);
  if (!ipartyRow) {
    await db.insert(interestedParty).values({
      organizationId: ctx.orgId,
      name: `${DEMO_TITLE_PREFIX}Neighboring residences association`,
      requirementsExpectations: "Transparent communication on odor/noise deviations and contingency drills.",
      influenceNotes:
        "High concern on ammonia refrigeration perception (synthetic stakeholder for demo UX).",
      reviewDue: daysFromNow(180),
    });
    console.log("Seeded interested party.");
  }

  const aspectName = `${DEMO_TITLE_PREFIX}Stormwater runoff from paved yards`;
  const [asp] = await db
    .select({ id: environmentalAspect.id })
    .from(environmentalAspect)
    .where(and(eq(environmentalAspect.organizationId, ctx.orgId), demoTitleStartsWith(environmentalAspect.name)))
    .limit(1);

  let aspectId: string | undefined;
  if (!asp) {
    const [a] = await db
      .insert(environmentalAspect)
      .values({
        organizationId: ctx.orgId,
        siteId: ctx.siteId,
        managementSystemScopeId: scopeId ?? null,
        activity: "Rainfall-driven sheet flow across loading aprons",
        name: aspectName,
        description: "Mobilization of dust and legacy oils toward catch basins (demonstration scenario).",
        environmentalImpact: "Potential surface water quality degradation if controls fail.",
        lifecycleStage: "operations",
        significance: "high",
      })
      .returning({ id: environmentalAspect.id });
    aspectId = a!.id;
    await db.insert(environmentalImpact).values({
      aspectId: aspectId,
      description: "Increased turbidity and sheen risk at outfall during intense rain (demo).",
    });
    console.log("Seeded environmental aspect + impact.");
  } else {
    aspectId = asp.id;
  }

  const [obRow] = await db
    .select({ id: complianceObligation.id })
    .from(complianceObligation)
    .where(and(eq(complianceObligation.organizationId, ctx.orgId), eq(complianceObligation.title, DEMO_STORMWATER_OBLIG_TITLE)))
    .limit(1);

  if (!obRow && aspectId) {
    const [ob] = await db
      .insert(complianceObligation)
      .values({
        organizationId: ctx.orgId,
        managementSystemScopeId: scopeId ?? null,
        title: DEMO_STORMWATER_OBLIG_TITLE,
        requirementType: "npdes_style",
        referenceCode: "DEMO-SW-GEN-001",
        jurisdiction: "Demo state",
        applicabilityNotes: "Synthetic obligation for environment dashboard samples.",
        ownerUserId: ctx.userId,
        applicableSiteIds: [ctx.siteId],
        nextReviewDue: daysFromNow(45),
      })
      .returning({ id: complianceObligation.id });

    await db.insert(obligationAspectLink).values({
      obligationId: ob!.id,
      aspectId,
    });

    await db.insert(environmentalMonitoringResult).values({
      organizationId: ctx.orgId,
      siteId: ctx.siteId,
      environmentalAspectId: aspectId,
      complianceObligationId: ob!.id,
      parameterName: "Turbidity NTU",
      measuredAt: daysAgo(12),
      valueText: "18",
      unit: "NTU",
      legalLimitText: "25 NTU benchmark (illustrative)",
      methodNote: "Grab sample; field nephelometer (demo fixture).",
    });
    console.log("Seeded environment obligation linkage + monitoring result.");
  }

  const hzTitle = `${DEMO_TITLE_PREFIX}Pinch points on divert arm packaging line`;
  const [hz] = await db
    .select({ id: hazard.id })
    .from(hazard)
    .where(and(eq(hazard.organizationId, ctx.orgId), demoTitleStartsWith(hazard.title)))
    .limit(1);

  let hazardId: string | undefined;
  if (!hz) {
    const [h] = await db
      .insert(hazard)
      .values({
        organizationId: ctx.orgId,
        siteId: ctx.siteId,
        title: hzTitle,
        description:
          "Moving divert arms during jams can trap fingers near chain guards (synthetic hazard).",
      })
      .returning({ id: hazard.id });
    hazardId = h!.id;
    console.log("Seeded hazard.");
  } else {
    hazardId = hz.id;
  }

  const riskCtxStart = `[Demo] Line 4 divert arm jams — pinch / struck-by during clearing`;
  const generalRiskContext = `${riskCtxStart}. Controls: interlocks, blocking, two-person rule when guard removed.`;
  const [rk] = await db
    .select({ id: riskAssessment.id, reviewDueAt: riskAssessment.reviewDueAt })
    .from(riskAssessment)
    .where(and(eq(riskAssessment.organizationId, ctx.orgId), eq(riskAssessment.context, generalRiskContext)))
    .limit(1);
  if (!rk && hazardId) {
    await db.insert(riskAssessment).values({
      organizationId: ctx.orgId,
      hazardId,
      summaryTitle: `${DEMO_TITLE_PREFIX}Line 4 divert arm — pinch during jam clear`,
      context: generalRiskContext,
      existingControls:
        "Interlocked guard doors; audible alarm during motion; toolbox topic quarterly.",
      inherentRating: "high",
      likelihoodScore: 4,
      consequenceScore: 4,
      residualRating: "medium",
      assessedByUserId: ctx.userId,
      reviewDueAt: daysAgo(5),
    });
    console.log("Seeded risk assessment.");
  } else if (rk && !rk.reviewDueAt) {
    await db
      .update(riskAssessment)
      .set({
        reviewDueAt: daysAgo(5),
        summaryTitle: `${DEMO_TITLE_PREFIX}Line 4 divert arm — pinch during jam clear`,
      })
      .where(eq(riskAssessment.id, rk.id));
    console.log("Backfilled risk assessment review due date.");
  }

  const taskRiskContext = `${DEMO_TITLE_PREFIX}Task-based LOTO verification — motor M-412 control panel`;
  const [taskRk] = await db
    .select({ id: riskAssessment.id })
    .from(riskAssessment)
    .where(and(eq(riskAssessment.organizationId, ctx.orgId), eq(riskAssessment.context, taskRiskContext)))
    .limit(1);
  if (!taskRk && hazardId) {
    const [ta] = await db
      .insert(riskAssessment)
      .values({
        organizationId: ctx.orgId,
        siteId: ctx.siteId,
        hazardId,
        assessmentKind: "task_based",
        status: "active",
        summaryTitle: `${DEMO_TITLE_PREFIX}LOTO verification — M-412`,
        context: taskRiskContext,
        existingControls: "LOTO tags; voltage test; pocket checklist on cart.",
        inherentRating: "medium",
        likelihoodScore: 3,
        consequenceScore: 4,
        residualRating: "low",
        assessedByUserId: ctx.userId,
        reviewDueAt: daysFromNow(14),
      })
      .returning({ id: riskAssessment.id });

    await db.insert(riskAssessmentStep).values({
      riskAssessmentId: ta!.id,
      sortOrder: 0,
      taskDescription:
        "De-energize M-412, apply locks, verify zero energy, document on permit board (demo task).",
      hazardText: "Unexpected energization during bearing inspection",
      controlsText: "LOTO checklist; second verifier when bus is live nearby",
      inherentRating: "high",
      residualRating: "medium",
    });
    console.log("Seeded task-based risk assessment + step.");
  }

  const objectiveTitle = `${DEMO_TITLE_PREFIX}Reduce recordable strains in rotating equipment work`;
  const [moRow] = await db
    .select({ id: managementObjective.id })
    .from(managementObjective)
    .where(and(eq(managementObjective.organizationId, ctx.orgId), demoTitleStartsWith(managementObjective.title)))
    .limit(1);

  if (!moRow) {
    await db.insert(managementObjective).values({
      organizationId: ctx.orgId,
      type: "oh_safety",
      title: objectiveTitle,
      description:
        "Target 25% YoY reduction in strains tied to rotating equipment servicing (demo KPI language).",
      targetMetrics:
        "TRIR adjunct: strain subset count / 200k hours; leading: high-torque JHA attestations.",
      dueDate: daysFromNow(365),
      status: "active",
    });
    console.log("Seeded management objective.");
  }
}

async function seedContractorsAndProgram(
  db: Db,
  ctx: { orgId: string; siteId: string; userId: string },
): Promise<void> {
  const company = `${DEMO_TITLE_PREFIX}Acme Scaffold & Industrial Access LLC`;
  const [party] = await db
    .select({ id: externalParty.id })
    .from(externalParty)
    .where(and(eq(externalParty.organizationId, ctx.orgId), demoTitleStartsWith(externalParty.companyName)))
    .limit(1);

  if (!party) {
    const [p] = await db
      .insert(externalParty)
      .values({
        organizationId: ctx.orgId,
        siteId: ctx.siteId,
        partyType: "contractor",
        companyName: company,
        contactName: "Jamie Ortiz",
        contactEmail: "jamie.ortiz@contractor.invalid",
        onboardedAt: daysAgo(400),
      })
      .returning({ id: externalParty.id });

    await db.insert(externalPartyCredential).values([
      {
        organizationId: ctx.orgId,
        externalPartyId: p!.id,
        kind: "insurance_coi",
        status: "active",
        identifier: `${DEMO_TITLE_PREFIX}GL-COI-88421`,
        validFrom: daysAgo(340),
        validTo: daysFromNow(21),
      },
      {
        organizationId: ctx.orgId,
        externalPartyId: p!.id,
        kind: "training_proof",
        status: "active",
        identifier: `${DEMO_TITLE_PREFIX}Fall protection refresher roster`,
        validFrom: daysAgo(110),
        validTo: daysFromNow(14),
      },
    ]);
    console.log("Seeded external party + expiring credentials (contractors banner).");
  }

  const scName = `${DEMO_TITLE_PREFIX}Tank farm coolant release tabletop`;
  const [sc] = await db
    .select({ id: emergencyScenario.id })
    .from(emergencyScenario)
    .where(and(eq(emergencyScenario.organizationId, ctx.orgId), demoTitleStartsWith(emergencyScenario.name)))
    .limit(1);

  if (!sc) {
    const [s] = await db
      .insert(emergencyScenario)
      .values({
        organizationId: ctx.orgId,
        siteId: ctx.siteId,
        name: scName,
        description:
          "Coolant release near containment dike response; ICS roles and spill kit deployment (demo).",
      })
      .returning({ id: emergencyScenario.id });

    await db.insert(emergencyDrill).values({
      organizationId: ctx.orgId,
      scenarioId: s!.id,
      drillDate: daysAgo(45),
      outcomeSummary:
        "Communications checklist updated; 12-minute deployment to boom inventory (synthetic).",
      attendeesNote: "Ops, EHS, facilities, volunteer fire liaison (roles only).",
    });
    console.log("Seeded emergency scenario + drill.");
  }

  const mocTitle = `${DEMO_TITLE_PREFIX}Hydraulic accumulator upsize — Line 2 baler`;
  const [mocRow] = await db
    .select({ id: managementOfChange.id })
    .from(managementOfChange)
    .where(and(eq(managementOfChange.organizationId, ctx.orgId), demoTitleStartsWith(managementOfChange.title)))
    .limit(1);
  if (!mocRow) {
    await db.insert(managementOfChange).values({
      organizationId: ctx.orgId,
      siteId: ctx.siteId,
      title: mocTitle,
      description:
        "Increasing accumulator capacity reduces kick-out frequency; affects guarding and bleed procedure (demo narrative).",
      plannedDate: daysFromNow(60),
      status: "under_review",
      ohSafetyImpact: true,
      environmentalImpactFlag: false,
    });
    console.log("Seeded management of change.");
  }

  const kpiName = `${DEMO_TITLE_PREFIX}Leading — near miss reports filed / 200k hrs`;
  const [kpi] = await db
    .select({ id: kpiDefinition.id })
    .from(kpiDefinition)
    .where(and(eq(kpiDefinition.organizationId, ctx.orgId), demoTitleStartsWith(kpiDefinition.name)))
    .limit(1);

  if (!kpi) {
    const [k] = await db
      .insert(kpiDefinition)
      .values({
        organizationId: ctx.orgId,
        siteId: ctx.siteId,
        name: kpiName,
        description: "Voluntary hazard reporting normalized to hours worked (demo).",
        kpiType: "leading",
        targetValue: "> 8",
      })
      .returning({ id: kpiDefinition.id });

    await db.insert(measurementRecord).values({
      organizationId: ctx.orgId,
      siteId: ctx.siteId,
      kpiDefinitionId: k!.id,
      category: "other",
      measuredAt: daysAgo(17),
      valueNumeric: "9.4",
      unit: "normalized index",
      notes: "Rolling 90-day normalization (demo).",
    });
    console.log("Seeded KPI + measurement.");
  }

  const DEMO_DSAR_CONTACT = "demo.dsar.nonexistent@synthetic.example";

  const [dsarExists] = await db
    .select({ id: dataSubjectRequest.id })
    .from(dataSubjectRequest)
    .where(
      and(
        eq(dataSubjectRequest.organizationId, ctx.orgId),
        eq(dataSubjectRequest.subjectContact, DEMO_DSAR_CONTACT),
      ),
    )
    .limit(1);
  if (!dsarExists) {
    await db.insert(dataSubjectRequest).values({
      organizationId: ctx.orgId,
      status: "in_review",
      subjectContact: DEMO_DSAR_CONTACT,
      requestType: "access_review",
      notes:
        "[Demo] Synthetic privacy request ticket for dashboard preview only — no real subject or lawful basis.",
      createdByUserId: ctx.userId,
    });
    console.log("Seeded demo data-subject access request.");
  }

  const cbBodyName = `${DEMO_TITLE_PREFIX}RegistrarCo Assurance B.V.`;
  const [cbAuditRow] = await db
    .select({ id: certificationBodyAudit.id })
    .from(certificationBodyAudit)
    .where(
      and(
        eq(certificationBodyAudit.organizationId, ctx.orgId),
        demoTitleStartsWith(certificationBodyAudit.certificationBodyName),
      ),
    )
    .limit(1);

  let cbAuditId = cbAuditRow?.id;
  if (!cbAuditId) {
    const [cbAudit] = await db
      .insert(certificationBodyAudit)
      .values({
        organizationId: ctx.orgId,
        certificationBodyName: cbBodyName,
        standardScope:
          "ISO 45001:2018 + ISO 14001:2026 transition programme integrated audit covering main site & North plant (synthetic oversight visit).",
        auditStartDate: daysAgo(120),
        auditEndDate: daysAgo(118),
        outcomeSummary:
          "Recommendation: strengthen contractor fatigue controls on night-shift mobilizations (demo text).",
      })
      .returning({ id: certificationBodyAudit.id });
    cbAuditId = cbAudit!.id;

    await db.insert(cbAuditFinding).values({
      organizationId: ctx.orgId,
      certificationBodyAuditId: cbAuditId,
      findingType: "observation",
      title: `${DEMO_TITLE_PREFIX}Contractor competence evidence lag on short-notice mobilizations`,
      details:
        "Gap between mobilization paperwork and competency matrix refresh for two-day bookings (demo).",
    });

    console.log("Seeded certification body audit + finding.");
  }

  const certStd = `${DEMO_TITLE_PREFIX}ISO 45001:2018`;
  const [certExists] = await db
    .select({ id: managementCertificate.id })
    .from(managementCertificate)
    .where(
      and(
        eq(managementCertificate.organizationId, ctx.orgId),
        demoTitleStartsWith(managementCertificate.standardName),
      ),
    )
    .limit(1);

  if (!certExists) {
    await db.insert(managementCertificate).values({
      organizationId: ctx.orgId,
      standardName: certStd,
      certificateNumber: "DEMO-OHS-AUD-99301",
      certificationBodyName: "RegistrarCo Assurance B.V. (demo registrar)",
      scopeStatement:
        "Design, manufacture, and packaging of fabricated goods — OH&S management systems at Demo Organization main campus (sample scope).",
      issuedAt: daysAgo(730),
      expiresAt: daysFromNow(40),
    });
    console.log("Seeded demo management certificate.");
  }
}

async function seedEnvironmentalRegulatoryPermits(
  db: Db,
  ctx: { orgId: string; siteId: string; userId: string },
): Promise<void> {
  const [exists] = await db
    .select({ id: environmentalRegulatoryPermit.id })
    .from(environmentalRegulatoryPermit)
    .where(
      and(
        eq(environmentalRegulatoryPermit.organizationId, ctx.orgId),
        demoTitleStartsWith(environmentalRegulatoryPermit.title),
      ),
    )
    .limit(1);

  if (exists) {
    console.log("Demo environmental regulatory permits already present.");
    const [pendingRow] = await db
      .select({ id: environmentalRegulatoryPermit.id })
      .from(environmentalRegulatoryPermit)
      .where(
        and(
          eq(environmentalRegulatoryPermit.organizationId, ctx.orgId),
          eq(environmentalRegulatoryPermit.title, DEMO_ENV_PERMIT_PENDING_TITLE),
        ),
      )
      .limit(1);
    if (pendingRow) {
      await seedEnvRegPermitApprovalInbox(db, ctx, pendingRow.id);
    }
    return;
  }

  const [oblig] = await db
    .select({ id: complianceObligation.id })
    .from(complianceObligation)
    .where(
      and(
        eq(complianceObligation.organizationId, ctx.orgId),
        eq(complianceObligation.title, DEMO_STORMWATER_OBLIG_TITLE),
      ),
    )
    .limit(1);

  const [active] = await db
    .insert(environmentalRegulatoryPermit)
    .values({
      organizationId: ctx.orgId,
      siteId: ctx.siteId,
      title: DEMO_ENV_PERMIT_ACTIVE_TITLE,
      permitIdentifier: "DEMO-NPDES-OUT-001W",
      agency: "Demo state water authority (synthetic)",
      jurisdiction: "Demo jurisdiction",
      media: "water",
      status: "active",
      issuedAt: daysAgo(400),
      effectiveFrom: daysAgo(380),
      expiresAt: daysFromNow(24),
      legalCitations: "Illustrative benchmark monitoring — demo UX only.",
      complianceObligationId: oblig?.id ?? null,
      ownerUserId: ctx.userId,
    })
    .returning({ id: environmentalRegulatoryPermit.id });

  await db.insert(environmentalRegulatoryPermitCondition).values([
    {
      permitId: active!.id,
      sortOrder: 0,
      conditionText:
        "Quarterly grab samples at Outfall 001-West; report NTU and pH within 48h of collection.",
      referenceCode: "DEMO-SW-MON-01",
    },
    {
      permitId: active!.id,
      sortOrder: 1,
      conditionText:
        "Maintain spill response inventory within 100 ft of outfall path during washdown season.",
      referenceCode: "DEMO-SW-SPI-02",
    },
  ]);

  const [pendingPermit] = await db
    .insert(environmentalRegulatoryPermit)
    .values({
      organizationId: ctx.orgId,
      siteId: ctx.siteId,
      title: DEMO_ENV_PERMIT_PENDING_TITLE,
      permitIdentifier: "DEMO-AIR-T5-BOILER",
      agency: "Demo air quality district (synthetic)",
      jurisdiction: "Demo jurisdiction",
      media: "air",
      status: "pending_approval",
      ownerUserId: ctx.userId,
    })
    .returning({ id: environmentalRegulatoryPermit.id });

  await db.insert(environmentalMonitoringResult).values({
    organizationId: ctx.orgId,
    siteId: ctx.siteId,
    environmentalRegulatoryPermitId: active!.id,
    complianceObligationId: oblig?.id ?? null,
    parameterName: "BOD5 mg/L",
    measuredAt: daysAgo(8),
    valueText: "12",
    unit: "mg/L",
    legalLimitText: "20 mg/L monthly avg (illustrative)",
    methodNote: "Demo fixture — not effluent compliance data.",
  });

  await seedEnvRegPermitApprovalInbox(db, ctx, pendingPermit!.id);
  console.log("Seeded environmental regulatory permits + conditions + monitoring.");
}

async function seedEnvRegPermitApprovalInbox(
  db: Db,
  ctx: { orgId: string; userId: string },
  pendingPermitId: string,
): Promise<void> {
  const [open] = await db
    .select({ id: approvalRequest.id })
    .from(approvalRequest)
    .where(
      and(
        eq(approvalRequest.organizationId, ctx.orgId),
        eq(approvalRequest.entityType, "environmental_regulatory_permit"),
        eq(approvalRequest.entityId, pendingPermitId),
        eq(approvalRequest.status, "open"),
      ),
    )
    .limit(1);
  if (open) {
    return;
  }
  await db.transaction(async (tx) => {
    await insertEnvironmentalRegulatoryPermitApprovalRequestTx(tx, {
      organizationId: ctx.orgId,
      environmentalRegulatoryPermitId: pendingPermitId,
      approverUserIds: [ctx.userId],
      actorUserId: ctx.userId,
      slaDaysPerStep: 4,
    });
  });
  console.log("Seeded environmental regulatory permit approval inbox.");
}

async function seedOrganizationSetupSteps(db: Db, orgId: string): Promise<void> {
  const now = new Date();
  const keys = [
    "context_scope",
    "environment",
    "documents",
    "planning",
    "program_iso",
  ] as const;
  for (const stepKey of keys) {
    await db
      .insert(organizationSetupStep)
      .values({ organizationId: orgId, stepKey, completedAt: now })
      .onConflictDoUpdate({
        target: [organizationSetupStep.organizationId, organizationSetupStep.stepKey],
        set: { completedAt: now },
      });
  }
  console.log("Marked organization setup steps complete for demo org.");
}

async function seedDemoEscalationEvents(
  db: Db,
  ctx: { orgId: string; userId: string },
): Promise<void> {
  const since90 = daysAgo(89);
  const [obsEscCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(escalationEvent)
    .where(
      and(
        eq(escalationEvent.organizationId, ctx.orgId),
        eq(escalationEvent.entityType, "safety_observation"),
        gte(escalationEvent.detectedAt, since90),
      ),
    );
  if (Number(obsEscCount?.n ?? 0) < 2) {
    const obvRows = await db
      .select({ id: safetyObservation.id })
      .from(safetyObservation)
      .where(
        and(eq(safetyObservation.organizationId, ctx.orgId), demoTitleStartsWith(safetyObservation.summary)),
      )
      .limit(1);
    const oid = obvRows[0]?.id;
    if (oid) {
      await db.insert(escalationEvent).values([
        {
          organizationId: ctx.orgId,
          entityType: "safety_observation",
          entityId: oid,
          detectedAt: daysAgo(10),
          message: "[Demo] Synthetic observation follow-up SLA signal.",
        },
        {
          organizationId: ctx.orgId,
          entityType: "safety_observation",
          entityId: oid,
          detectedAt: daysAgo(30),
          message: "[Demo] Synthetic observation follow-up SLA signal (earlier).",
        },
      ]);
      console.log("Seeded demo observation escalation_event rows.");
    }
  }

  const [apprEscCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(escalationEvent)
    .where(
      and(
        eq(escalationEvent.organizationId, ctx.orgId),
        eq(escalationEvent.entityType, "approval_step"),
        gte(escalationEvent.detectedAt, since90),
      ),
    );
  if (Number(apprEscCount?.n ?? 0) < 2) {
    const stepRows = await db
      .select({ id: approvalStep.id })
      .from(approvalStep)
      .innerJoin(approvalRequest, eq(approvalStep.requestId, approvalRequest.id))
      .where(
        and(
          eq(approvalRequest.organizationId, ctx.orgId),
          eq(approvalRequest.status, "open"),
          or(
            eq(approvalRequest.entityType, "capa"),
            eq(approvalRequest.entityType, "work_permit"),
            eq(approvalRequest.entityType, "environmental_regulatory_permit"),
          ),
        ),
      )
      .limit(1);
    const sid = stepRows[0]?.id;
    if (sid) {
      await db.insert(escalationEvent).values([
        {
          organizationId: ctx.orgId,
          entityType: "approval_step",
          entityId: sid,
          detectedAt: daysAgo(11),
          message: "[Demo] Synthetic approval SLA escalation.",
        },
        {
          organizationId: ctx.orgId,
          entityType: "approval_step",
          entityId: sid,
          detectedAt: daysAgo(28),
          message: "[Demo] Synthetic approval SLA escalation (earlier).",
        },
      ]);
      console.log("Seeded demo approval_step escalation_event rows.");
    }
  }
}

async function seedDemoCronRunsIfStale(db: Db): Promise<void> {
  if (process.env.DEMO_SEED_CRON_RUNS === "0") {
    console.log("Skipping cron_job_run seed (DEMO_SEED_CRON_RUNS=0).");
    return;
  }
  const horizon = daysAgo(7);
  for (const jobKey of CRON_JOB_KEYS) {
    const [recent] = await db
      .select({ id: cronJobRun.id })
      .from(cronJobRun)
      .where(
        and(eq(cronJobRun.jobKey, jobKey), eq(cronJobRun.ok, true), gte(cronJobRun.startedAt, horizon)),
      )
      .orderBy(desc(cronJobRun.startedAt))
      .limit(1);
    if (recent) {
      continue;
    }
    const startedAt = daysAgo(1);
    const finishedAt = new Date(startedAt.getTime() + 1200);
    await db.insert(cronJobRun).values({
      jobKey,
      startedAt,
      finishedAt,
      ok: true,
      durationMs: 1200,
      errorMessage: null,
    });
    console.log(`Seeded synthetic cron_job_run for ${jobKey} (no recent ok run in 7d).`);
  }
}

async function seedRagEvidenceIntegrationsOps(
  db: Db,
  ctx: { orgId: string; siteId: string; userId: string },
  incidentIds: Map<string, string>,
): Promise<void> {
  const [ragExists] = await db
    .select({ id: ragSource.id })
    .from(ragSource)
    .where(and(eq(ragSource.organizationId, ctx.orgId), eq(ragSource.title, DEMO_RFC1123_SOURCE_TITLE)))
    .limit(1);

  if (!ragExists) {
    const [src] = await db
      .insert(ragSource)
      .values({
        organizationId: ctx.orgId,
        siteId: ctx.siteId,
        title: DEMO_RFC1123_SOURCE_TITLE,
        sourceUri: "demo://local/rag/hot-work-coordinator.txt",
        programTag: "oh_safety",
        topicTags: ["permits", "demo"],
        rawText:
          "[Demo] Hot work coordinators verify extinguisher distance and spark containment before ignition.",
        mimeType: "text/plain",
        status: "ready",
      })
      .returning({ id: ragSource.id });

    await db.insert(ragChunk).values({
      organizationId: ctx.orgId,
      sourceId: src!.id,
      chunkIndex: 0,
      content:
        "[Demo] Coordinate fire watch roster; verify 35 ft radius clear of combustibles; ignitions only after gas-free confirmation.",
      meta: { demo: true },
    });

    const [oblig] = await db
      .select({ id: complianceObligation.id })
      .from(complianceObligation)
      .where(
        and(
          eq(complianceObligation.organizationId, ctx.orgId),
          eq(complianceObligation.title, DEMO_STORMWATER_OBLIG_TITLE),
        ),
      )
      .limit(1);
    if (oblig) {
      await db.insert(obligationEvidenceLink).values({
        obligationId: oblig.id,
        ragSourceId: src!.id,
        note: "[Demo] obligation ↔ RAG link",
      });
    }
    console.log("Seeded demo RAG source + chunk + obligation link.");
  }

  const forkId = incidentIds.get(DEMO_INCIDENT_FORKLIFT);
  if (forkId) {
    const [ea] = await db
      .select({ id: ehsEvidenceAttachment.id })
      .from(ehsEvidenceAttachment)
      .where(
        and(
          eq(ehsEvidenceAttachment.organizationId, ctx.orgId),
          eq(ehsEvidenceAttachment.entityType, "incident"),
          eq(ehsEvidenceAttachment.entityId, forkId),
        ),
      )
      .limit(1);
    if (!ea) {
      await db.insert(ehsEvidenceAttachment).values({
        organizationId: ctx.orgId,
        entityType: "incident",
        entityId: forkId,
        fileName: `${DEMO_TITLE_PREFIX}dock-traffic-sketch.txt`,
        mimeType: "text/plain",
        byteSize: 256,
        storageUri: "https://example.invalid/ehs-demo/evidence/dock-sketch.txt",
        uploadedByUserId: ctx.userId,
      });
      console.log("Seeded demo incident evidence attachment (placeholder URI).");
    }
  }

  const [ief] = await db
    .select({ id: integrationEvent.id })
    .from(integrationEvent)
    .where(and(eq(integrationEvent.organizationId, ctx.orgId), like(integrationEvent.eventType, "demo.%")))
    .limit(1);
  if (!ief) {
    await db.insert(integrationEvent).values({
      organizationId: ctx.orgId,
      eventType: "demo.hris_membership_sync",
      payload: { synthetic: true, note: "[Demo] Synthetic integration failure — no external system." },
      processingStatus: "failed",
      processingError: "[Demo] Placeholder: connector timeout / schema mismatch (illustrative).",
    });
    console.log("Seeded demo failed integration_event.");
  }

  const demoWebhookUrl = "https://example.invalid/ehs-demo-webhook";
  const [wh] = await db
    .select({ id: operationalWebhookEndpoint.id })
    .from(operationalWebhookEndpoint)
    .where(
      and(
        eq(operationalWebhookEndpoint.organizationId, ctx.orgId),
        eq(operationalWebhookEndpoint.targetUrl, demoWebhookUrl),
      ),
    )
    .limit(1);
  if (!wh) {
    await db.insert(operationalWebhookEndpoint).values({
      organizationId: ctx.orgId,
      targetUrl: demoWebhookUrl,
      secret: null,
      subscribedEvents: [],
      enabled: false,
    });
    console.log("Seeded demo operational webhook endpoint (disabled).");
  }

  const ck = INTEGRATION_CONNECTOR_KEYS[0]!;
  const [mapRow] = await db
    .select({ id: integrationConnectorMapping.id })
    .from(integrationConnectorMapping)
    .where(
      and(
        eq(integrationConnectorMapping.organizationId, ctx.orgId),
        eq(integrationConnectorMapping.connectorKey, ck),
      ),
    )
    .limit(1);
  if (!mapRow) {
    await db.insert(integrationConnectorMapping).values({
      organizationId: ctx.orgId,
      connectorKey: ck,
      mappingJson: {
        demoFixture: true,
        courseIdField: "externalCourseId",
        note: "[Demo] Minimal mapping — adjust for your LMS.",
      },
    });
    console.log(`Seeded demo integration_connector_mapping (${ck}).`);
  }
}

async function main() {
  await ensureDemoUserExists();

  const email = (
    process.env.DEMO_ADMIN_EMAIL ?? "demo.admin@example.com"
  ).toLowerCase();

  const { db } = await import("../src/server/db");

  const { orgId, siteId, userId } = await ensureRbacForUser(db, email);
  const northSite = await ensureSecondarySite(db, orgId);

  const slice = await seedIncidentsCapasTrainingDocsAudit(db, {
    orgId,
    siteId,
    northSiteId: northSite.id,
    userId,
  });

  const incidentIds = slice?.incidentIds ?? new Map<string, string>();
  if (!slice) {
    const rows = await db
      .select({ id: incident.id, title: incident.title })
      .from(incident)
      .where(and(eq(incident.organizationId, orgId), demoTitleStartsWith(incident.title)));
    for (const r of rows) {
      incidentIds.set(r.title!, r.id);
    }
  }

  await ensureDemoFallIncidentExists(
    db,
    {
      orgId,
      siteId,
      northSiteId: northSite.id,
      userId,
    },
    incidentIds,
  );

  await seedObservations(db, {
    orgId,
    siteId,
    northSiteId: northSite.id,
    userId,
  });

  await seedInspections(db, {
    orgId,
    siteId,
    northSiteId: northSite.id,
    userId,
  });

  const permitIds = await seedPermits(db, { orgId, siteId, userId });
  if (permitIds?.pendingPermitId) {
    await seedPermitApprovalInbox(db, { orgId, userId }, permitIds.pendingPermitId);
  }

  await seedCapaApprovalInbox(db, { orgId, userId });

  await seedTasksGovernanceMetrics(db, { orgId, siteId, userId }, incidentIds);

  await seedEnvironmentPlanningContext(db, {
    orgId,
    siteId,
    northSiteId: northSite.id,
    userId,
  });

  await seedContractorsAndProgram(db, { orgId, siteId, userId });

  await seedEnvironmentalRegulatoryPermits(db, { orgId, siteId, userId });

  await ensureDemoIncidentsHaveRca(db, orgId, incidentIds);

  await seedOrganizationSetupSteps(db, orgId);

  await seedDemoEscalationEvents(db, { orgId, userId });

  await seedDemoCronRunsIfStale(db);

  await seedRagEvidenceIntegrationsOps(db, { orgId, siteId, userId }, incidentIds);

  await seedDemoEscalationEvents(db, { orgId, userId });

  await seedDemoCronRunsIfStale(db);

  await seedRagEvidenceIntegrationsOps(db, { orgId, siteId, userId }, incidentIds);

  await seedJuly2026RegulatoryAids(db, { orgId, siteId });

  console.log(
    `Demo seed complete. Sign in as ${email} (use DEMO_MODE quick login or password from env).`,
  );
}

async function seedJuly2026RegulatoryAids(
  db: Db,
  ctx: { orgId: string; siteId: string },
) {
  const [existingHeat] = await db
    .select({ id: heatIllnessPreventionProgram.id })
    .from(heatIllnessPreventionProgram)
    .where(eq(heatIllnessPreventionProgram.organizationId, ctx.orgId))
    .limit(1);

  if (!existingHeat) {
    const [program] = await db
      .insert(heatIllnessPreventionProgram)
      .values({
        organizationId: ctx.orgId,
        siteId: ctx.siteId,
        title: `${DEMO_TITLE_PREFIX}Heat illness prevention — packaging`,
        notes: "Demo Heat NEP Appendix I programme aid (not a federal heat standard).",
        coversOutdoor: false,
        coversIndoor: true,
        naicsNote: "Demo packaging NAICS note",
      })
      .returning({ id: heatIllnessPreventionProgram.id });

    if (program) {
      await db.insert(heatProgramControlCheck).values([
        {
          organizationId: ctx.orgId,
          programId: program.id,
          checkKey: "cool_water_access",
          status: "in_place",
          evidenceNotes: "Hydration stations on Line 4 (demo).",
        },
        {
          organizationId: ctx.orgId,
          programId: program.id,
          checkKey: "acclimatization",
          status: "partial",
          evidenceNotes: "New-hire ramp planned; supervisor checklist pending (demo).",
        },
      ]);
    }
    console.log("Seeded Heat NEP program aid demo rows.");
  }

  const chemName = `${DEMO_TITLE_PREFIX}Isopropyl alcohol (demo)`;
  const [existingChem] = await db
    .select({ id: regulatoryChemical.id })
    .from(regulatoryChemical)
    .where(
      and(
        eq(regulatoryChemical.organizationId, ctx.orgId),
        eq(regulatoryChemical.name, chemName),
      ),
    )
    .limit(1);

  if (!existingChem) {
    const [chem] = await db
      .insert(regulatoryChemical)
      .values({
        organizationId: ctx.orgId,
        name: chemName,
        casNumber: "67-63-0",
        description: "Demo chemical for HCS 2024 / EPCRA 2027 hazard category programme fields.",
      })
      .returning({ id: regulatoryChemical.id });

    if (chem) {
      await db.insert(chemicalHazardClassification).values({
        organizationId: ctx.orgId,
        regulatoryChemicalId: chem.id,
        hazardDomain: "physical",
        hazardClass: "Flammable liquids",
        hazardCategory: "Category 2",
        source: "manual",
      });
    }
    console.log("Seeded chemical + HCS hazard classification demo rows.");
  }

  const climateIssueCat = `${DEMO_TITLE_PREFIX}climate transition`;
  const [existingIssue] = await db
    .select({ id: contextIssue.id })
    .from(contextIssue)
    .where(
      and(
        eq(contextIssue.organizationId, ctx.orgId),
        eq(contextIssue.category, climateIssueCat),
      ),
    )
    .limit(1);

  if (!existingIssue) {
    await db.insert(contextIssue).values({
      organizationId: ctx.orgId,
      kind: "external",
      category: climateIssueCat,
      environmentalConditionTags: ["climate_change", "natural_resource_availability"],
      description:
        "ISO 14001:2026 context consideration for climate and resource availability (demo).",
    });
    console.log("Seeded ISO 14001:2026 context environmental condition issue.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
