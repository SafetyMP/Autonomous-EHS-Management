import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import {
  parseTrainingCompletionPayload,
  persistTrainingCompletionEvent,
} from "@/server/services/trainingCompletionIngest";

/**
 * LMS / training system webhook. Requires `INTEGRATION_INBOUND_SECRET` and
 * `Authorization: Bearer <secret>`. Body must match training completion schema.
 */
export async function POST(request: Request) {
  const secret = env.INTEGRATION_INBOUND_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Integration inbound is not configured." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseTrainingCompletionPayload(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const row = await persistTrainingCompletionEvent(db, parsed.data, null);
    return NextResponse.json({ ok: true, id: row.id });
  } catch {
    return NextResponse.json({ error: "Persist failed" }, { status: 500 });
  }
}
