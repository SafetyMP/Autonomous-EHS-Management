/**
 * Removes demo-scoped rows for "Demo Organization", then re-runs demo seed.
 *
 * Usage: npx tsx scripts/reset-demo-org.ts
 */
import { spawnSync } from "node:child_process";
import { and, eq, inArray, like } from "drizzle-orm";
import {
  approvalRequest,
  approvalStep,
  auditFinding,
  controlledDocument,
  correctiveAction,
  documentRevision,
  externalPartyCredential,
  incident,
  inspection,
  internalAudit,
  organization,
  trainingRecord,
} from "../src/server/db/schema";
import { demoTitleStartsWith } from "./lib/demo-scope";
import { loadEnvFiles } from "./lib/load-env";

loadEnvFiles();

const DEMO_DOC_PREFIX = "DEMO-%";

async function main() {
  const { db } = await import("../src/server/db");

  const [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.name, "Demo Organization"))
    .limit(1);

  if (!org) {
    console.log('No "Demo Organization" found; nothing to reset.');
    return;
  }

  const demoAuditIds = db
    .select({ id: internalAudit.id })
    .from(internalAudit)
    .where(
      and(
        eq(internalAudit.organizationId, org.id),
        demoTitleStartsWith(internalAudit.title),
      ),
    );

  await db.delete(auditFinding).where(
    inArray(auditFinding.internalAuditId, demoAuditIds),
  );

  await db
    .delete(internalAudit)
    .where(
      and(
        eq(internalAudit.organizationId, org.id),
        demoTitleStartsWith(internalAudit.title),
      ),
    );

  const demoDocIds = db
    .select({ id: controlledDocument.id })
    .from(controlledDocument)
    .where(
      and(
        eq(controlledDocument.organizationId, org.id),
        like(controlledDocument.documentNumber, DEMO_DOC_PREFIX),
      ),
    );

  await db.delete(documentRevision).where(
    inArray(documentRevision.documentId, demoDocIds),
  );

  await db
    .delete(controlledDocument)
    .where(
      and(
        eq(controlledDocument.organizationId, org.id),
        like(controlledDocument.documentNumber, DEMO_DOC_PREFIX),
      ),
    );

  await db
    .delete(trainingRecord)
    .where(
      and(
        eq(trainingRecord.organizationId, org.id),
        demoTitleStartsWith(trainingRecord.courseTitle),
      ),
    );

  const demoApprovalReqIds = await db
    .select({ id: approvalRequest.id })
    .from(approvalRequest)
    .where(eq(approvalRequest.organizationId, org.id));

  if (demoApprovalReqIds.length > 0) {
    await db.delete(approvalStep).where(
      inArray(
        approvalStep.requestId,
        demoApprovalReqIds.map((r) => r.id),
      ),
    );
    await db.delete(approvalRequest).where(eq(approvalRequest.organizationId, org.id));
  }

  await db.delete(inspection).where(eq(inspection.organizationId, org.id));

  await db
    .delete(externalPartyCredential)
    .where(eq(externalPartyCredential.organizationId, org.id));

  await db
    .delete(correctiveAction)
    .where(
      and(
        eq(correctiveAction.organizationId, org.id),
        demoTitleStartsWith(correctiveAction.title),
      ),
    );

  await db
    .delete(incident)
    .where(
      and(
        eq(incident.organizationId, org.id),
        demoTitleStartsWith(incident.title),
      ),
    );

  console.log("Cleared demo-scoped rows. Repopulating…");
  const r = spawnSync("npm", ["run", "db:seed:demo"], {
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
