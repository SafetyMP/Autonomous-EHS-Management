import { NextResponse } from "next/server";
import { desc, eq, gte, sql } from "drizzle-orm";
import { logError } from "@/lib/logger";
import { readValidatedEnv } from "@/server/read-env";
import { db } from "@/server/db";
import { cronJobRun } from "@/server/db/schema";
import {
  buildCronPrometheusText,
  defaultCronMetricsWindowHours,
} from "@/server/cron/cronMetrics/prometheusFormat";
import { contextSyncOrgDailyReadLimit } from "@/server/services/contextSync/dailyReadQuota";
import { CRON_JOB_KEYS } from "@/server/cron/recordCronRun";

/**
 * Prometheus-compatible cron metrics for dashboards / SLO alerting.
 * Uses the same `Authorization: Bearer <CRON_SECRET>` gate as cron handlers.
 *
 * Query: ?format=json for JSON; default is Prometheus text exposition.
 * Optional ?windowHours=168 (1–8760) scopes *_in_window series.
 */
export async function GET(request: Request) {
  const env = readValidatedEnv();
  const secret = env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const windowHoursRaw = url.searchParams.get("windowHours");
  const windowHours =
    windowHoursRaw === null || windowHoursRaw === ""
      ? defaultCronMetricsWindowHours()
      : Number(windowHoursRaw);
  if (!Number.isFinite(windowHours) || windowHours < 1 || windowHours > 8760) {
    return NextResponse.json({ error: "invalid_window_hours" }, { status: 400 });
  }

  const since = new Date(Date.now() - windowHours * 3600 * 1000);

  try {
    const rollupRows = await db
      .select({
        jobKey: cronJobRun.jobKey,
        successCount: sql<number>`coalesce(sum(case when ${cronJobRun.ok} then 1 else 0 end), 0)::int`,
        errorCount: sql<number>`coalesce(sum(case when ${cronJobRun.ok} then 0 else 1 end), 0)::int`,
      })
      .from(cronJobRun)
      .where(gte(cronJobRun.startedAt, since))
      .groupBy(cronJobRun.jobKey);

    const rollup = new Map<string, { success: number; errors: number }>();
    for (const r of rollupRows) {
      rollup.set(r.jobKey, { success: r.successCount, errors: r.errorCount });
    }

    const latest = new Map<
      string,
      { startedAt: Date; durationMs: number; ok: boolean } | undefined
    >();
    await Promise.all(
      CRON_JOB_KEYS.map(async (jobKey) => {
        const [row] = await db
          .select({
            startedAt: cronJobRun.startedAt,
            durationMs: cronJobRun.durationMs,
            ok: cronJobRun.ok,
          })
          .from(cronJobRun)
          .where(eq(cronJobRun.jobKey, jobKey))
          .orderBy(desc(cronJobRun.startedAt))
          .limit(1);
        latest.set(
          jobKey,
          row
            ? { startedAt: row.startedAt, durationMs: row.durationMs, ok: row.ok }
            : undefined,
        );
      }),
    );

    const format = url.searchParams.get("format") ?? "prometheus";

    if (format === "json") {
      return NextResponse.json(
        {
          windowHours,
          rollup: Object.fromEntries(rollup),
          latest: Object.fromEntries(latest),
          contextSyncOrgDailyReadLimit: contextSyncOrgDailyReadLimit(),
        },
        { headers: { "cache-control": "no-store" } },
      );
    }

    const body = buildCronPrometheusText({
      windowHours,
      knownJobs: [...CRON_JOB_KEYS],
      rollup,
      latest,
      contextSyncOrgDailyReadLimit: contextSyncOrgDailyReadLimit(),
    });

    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    logError("cron.metrics.query_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "metrics_unavailable" }, { status: 503 });
  }
}
