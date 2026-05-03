/** Escape a value for Prometheus text exposition label or help text line. */
export function escapePrometheusLabelValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", " ").replaceAll('"', '\\"');
}

const WINDOW_HOURS_DEFAULT = 168;

/** Build Prometheus exposition text for scrape targets (Datadog/OpenTelemetry-compatible parsers). */
export function buildCronPrometheusText(payload: {
  windowHours: number;
  knownJobs: readonly string[];
  rollup: Map<string, { success: number; errors: number }>;
  latest: Map<string, { startedAt: Date; durationMs: number; ok: boolean } | undefined>;
  /** When set, exposes configured Context Sync per-org daily read cap (0 = off). */
  contextSyncOrgDailyReadLimit?: number;
}): string {
  const lines: string[] = [];
  const wh = payload.windowHours;

  lines.push(
    `# HELP ehs_cron_job_runs_success_in_window Successful cron completions in rolling ${wh}h window`,
  );
  lines.push("# TYPE ehs_cron_job_runs_success_in_window gauge");
  lines.push(
    `# HELP ehs_cron_job_runs_error_in_window Failed cron completions in rolling ${wh}h window`,
  );
  lines.push("# TYPE ehs_cron_job_runs_error_in_window gauge");
  lines.push(
    "# HELP ehs_cron_job_last_run_timestamp_seconds Unix time of latest run start per job_key",
  );
  lines.push("# TYPE ehs_cron_job_last_run_timestamp_seconds gauge");
  lines.push("# HELP ehs_cron_job_last_run_duration_ms Duration of latest run per job_key");
  lines.push("# TYPE ehs_cron_job_last_run_duration_ms gauge");
  lines.push("# HELP ehs_cron_job_last_run_ok Whether the latest run completed successfully (1|0)");
  lines.push("# TYPE ehs_cron_job_last_run_ok gauge");

  for (const jobKey of payload.knownJobs) {
    const counts = payload.rollup.get(jobKey) ?? { success: 0, errors: 0 };
    const j = escapePrometheusLabelValue(jobKey);
    lines.push(`ehs_cron_job_runs_success_in_window{job="${j}"} ${counts.success}`);
    lines.push(`ehs_cron_job_runs_error_in_window{job="${j}"} ${counts.errors}`);
  }

  for (const jobKey of payload.knownJobs) {
    const j = escapePrometheusLabelValue(jobKey);
    const run = payload.latest.get(jobKey);
    if (!run) {
      lines.push(`ehs_cron_job_last_run_timestamp_seconds{job="${j}"} 0`);
      lines.push(`ehs_cron_job_last_run_duration_ms{job="${j}"} 0`);
      lines.push(`ehs_cron_job_last_run_ok{job="${j}"} 0`);
      continue;
    }
    const ts = Math.floor(run.startedAt.getTime() / 1000);
    lines.push(`ehs_cron_job_last_run_timestamp_seconds{job="${j}"} ${ts}`);
    lines.push(`ehs_cron_job_last_run_duration_ms{job="${j}"} ${run.durationMs}`);
    lines.push(`ehs_cron_job_last_run_ok{job="${j}"} ${run.ok ? 1 : 0}`);
  }

  lines.push(
    `# HELP ehs_cron_metrics_window_hours Hours included in *_in_window series for this scrape`,
  );
  lines.push("# TYPE ehs_cron_metrics_window_hours gauge");
  lines.push(`ehs_cron_metrics_window_hours ${wh}`);

  if (payload.contextSyncOrgDailyReadLimit !== undefined) {
    lines.push(
      "# HELP ehs_context_sync_org_daily_read_limit Configured max Context Sync REST reads per organization per UTC day (0 means quota disabled)",
    );
    lines.push("# TYPE ehs_context_sync_org_daily_read_limit gauge");
    lines.push(`ehs_context_sync_org_daily_read_limit ${payload.contextSyncOrgDailyReadLimit}`);
  }

  lines.push("", "# eos");
  return lines.join("\n");
}

export function defaultCronMetricsWindowHours(): number {
  return WINDOW_HOURS_DEFAULT;
}
