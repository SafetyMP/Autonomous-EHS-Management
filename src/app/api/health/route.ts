import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * Liveness / DB connectivity for Codespaces, previews, and ops smoke checks.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, database: "up" });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        database: "down",
        error: e instanceof Error ? e.message : "unknown",
      },
      { status: 503 },
    );
  }
}
