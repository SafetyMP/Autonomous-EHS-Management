import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as NeonPool } from "@neondatabase/serverless";
import pg from "pg";
import { readValidatedEnv } from "@/server/read-env";
import * as schema from "./schema";

function createDb() {
  const env = readValidatedEnv();
  if (env.DATABASE_USE_PG === "1") {
    const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
    return drizzlePg(pool, { schema });
  }

  const pool = new NeonPool({ connectionString: env.DATABASE_URL });
  return drizzleNeon(pool, { schema });
}

export type Db = ReturnType<typeof createDb>;

let dbSingleton: Db | undefined;

export function getDb(): Db {
  if (!dbSingleton) {
    dbSingleton = createDb();
  }
  return dbSingleton;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(real);
    }
    return value;
  },
}) as Db;
