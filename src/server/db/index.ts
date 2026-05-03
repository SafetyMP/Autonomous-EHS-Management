import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as NeonPool } from "@neondatabase/serverless";
import pg from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

function createDb() {
  if (env.DATABASE_USE_PG === "1") {
    const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
    return drizzlePg(pool, { schema });
  }

  const pool = new NeonPool({ connectionString: env.DATABASE_URL });
  return drizzleNeon(pool, { schema });
}

export const db = createDb();

export type Db = typeof db;
