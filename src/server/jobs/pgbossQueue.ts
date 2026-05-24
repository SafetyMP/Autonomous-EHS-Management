import "server-only";
import { PgBoss } from "pg-boss";
import { env } from "@/lib/env";
import type { JobEnqueueOptions, JobName, JobPayloadMap, JobQueue } from "./types";

let boss: PgBoss | null = null;
let startPromise: Promise<PgBoss> | null = null;

async function ensureBoss(): Promise<PgBoss> {
  if (boss) return boss;
  if (!startPromise) {
    startPromise = (async () => {
      const instance = new PgBoss({
        connectionString: env.DATABASE_URL,
        ...(env.PG_BOSS_SCHEMA ? { schema: env.PG_BOSS_SCHEMA } : {}),
      });
      await instance.start();
      boss = instance;
      return instance;
    })();
  }
  return startPromise;
}

export class PgBossJobQueue implements JobQueue {
  async enqueue<N extends JobName>(
    name: N,
    payload: JobPayloadMap[N],
    options?: JobEnqueueOptions,
  ): Promise<void> {
    const b = await ensureBoss();
    if (options?.singletonKey) {
      await b.send(name, payload as object, { singletonKey: options.singletonKey });
    } else {
      await b.send(name, payload as object);
    }
  }
}
