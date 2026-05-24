/**
 * Long-lived pg-boss worker for async jobs (integration replay, HRIS inbound, retention chunks).
 * Run on Kubernetes/VM — not on Vercel serverless. See docs/JOB_QUEUE.md.
 */
import { PgBoss } from "pg-boss";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { loadEnvFiles } from "./lib/load-env";
import * as schema from "../src/server/db/schema";
import { JOB_NAMES } from "../src/server/jobs/types";
import type { JobPayloadMap } from "../src/server/jobs/types";
import {
  processHrisMembershipSyncInbound,
  reprocessFailedIntegrationEvent,
} from "../src/server/services/integrationInboundDispatch";
import { reconcileRosterForOrg } from "../src/server/services/rosterReconciliation";
import { storeIntegrationInboundCache } from "../src/server/services/integrationInboundIdempotencyCache";
import { runDataRetentionCron } from "../src/server/services/dataRetention";

loadEnvFiles();

const url = process.env.DATABASE_URL;
if (!url?.trim()) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const schemaName = process.env.PG_BOSS_SCHEMA;

async function main() {
  const boss = new PgBoss({
    connectionString: url,
    ...(schemaName ? { schema: schemaName } : {}),
  });

  await boss.start();

  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  await boss.work(
    JOB_NAMES.INTEGRATION_REPROCESS_FAILED,
    async (jobs) => {
      for (const job of jobs) {
        const data = job.data as JobPayloadMap[typeof JOB_NAMES.INTEGRATION_REPROCESS_FAILED];
        await reprocessFailedIntegrationEvent(db, {
          organizationId: data.organizationId,
          eventId: data.eventId,
          actorUserId: data.actorUserId,
        });
      }
    },
  );

  await boss.work(JOB_NAMES.DATA_RETENTION_RUN_CHUNK, async (jobs) => {
    for (const job of jobs) {
      const data = job.data as JobPayloadMap[typeof JOB_NAMES.DATA_RETENTION_RUN_CHUNK];
      const batchSize = data.batchSize ?? 75;
      await runDataRetentionCron(db, { batchSize });
    }
  });

  await boss.work(JOB_NAMES.INTEGRATION_INBOUND_HRIS, async (jobs) => {
    for (const job of jobs) {
      const data = job.data as JobPayloadMap[typeof JOB_NAMES.INTEGRATION_INBOUND_HRIS];
      const out = await processHrisMembershipSyncInbound(db, data.input);
      const idem = data.input.idempotencyKey?.trim();
      if (idem) {
        if (out.processingStatus === "failed") {
          await storeIntegrationInboundCache(db, data.input.organizationId, idem, 422, {
            ok: false,
            id: out.id,
            error: out.error ?? "processing_failed",
          });
        } else {
          await storeIntegrationInboundCache(db, data.input.organizationId, idem, 200, {
            ok: true,
            id: out.id,
            processingStatus: out.processingStatus,
          });
        }
      }
    }
  });

  await boss.work(JOB_NAMES.INTEGRATION_RECONCILE_ROSTER, async (jobs) => {
    for (const job of jobs) {
      const data = job.data as JobPayloadMap[typeof JOB_NAMES.INTEGRATION_RECONCILE_ROSTER];
      await reconcileRosterForOrg(db, data.organizationId);
    }
  });

  console.log(
    `pg-boss worker listening on ${JOB_NAMES.INTEGRATION_REPROCESS_FAILED}, ${JOB_NAMES.DATA_RETENTION_RUN_CHUNK}, ${JOB_NAMES.INTEGRATION_INBOUND_HRIS}, ${JOB_NAMES.INTEGRATION_RECONCILE_ROSTER} (boss schema: ${schemaName ?? "pgboss"})`,
  );

  process.on("SIGINT", async () => {
    await boss.stop({ graceful: true, timeout: 5000 });
    await pool.end();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
