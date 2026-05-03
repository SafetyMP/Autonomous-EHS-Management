import { describe, expect, it } from "vitest";
import { buildCronPrometheusText } from "@/server/cron/cronMetrics/prometheusFormat";

describe("buildCronPrometheusText", () => {
  it("emits gauges for known jobs and window helper", () => {
    const rollup = new Map([
      ["reminders", { success: 2, errors: 1 }],
      ["data-retention", { success: 1, errors: 0 }],
    ]);
    const started = new Date("2026-05-03T12:00:00.000Z");
    const latest = new Map<
      string,
      { startedAt: Date; durationMs: number; ok: boolean } | undefined
    >([
      ["reminders", { startedAt: started, durationMs: 100, ok: true }],
      ["data-retention", undefined],
    ]);
    const text = buildCronPrometheusText({
      windowHours: 168,
      knownJobs: ["reminders", "data-retention"],
      rollup,
      latest,
    });
    expect(text).toContain(
      `ehs_cron_job_last_run_timestamp_seconds{job="reminders"} ${Math.floor(started.getTime() / 1000)}`,
    );
    expect(text).toContain('ehs_cron_job_runs_success_in_window{job="reminders"} 2');
    expect(text).toContain('ehs_cron_job_runs_error_in_window{job="reminders"} 1');
    expect(text).toContain(`ehs_cron_metrics_window_hours 168`);
    expect(text).toContain('ehs_cron_job_last_run_ok{job="data-retention"} 0');
  });

  it("includes Context Sync quota gauge when limit is provided", () => {
    const text = buildCronPrometheusText({
      windowHours: 24,
      knownJobs: [],
      rollup: new Map(),
      latest: new Map(),
      contextSyncOrgDailyReadLimit: 5000,
    });
    expect(text).toContain("ehs_context_sync_org_daily_read_limit");
    expect(text).toContain("ehs_context_sync_org_daily_read_limit 5000");
  });
});
