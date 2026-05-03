import { expect, test } from "@playwright/test";

test.describe("cron metrics (Prometheus exposition)", () => {
  test("@smoke rejects unauthenticated metrics scrape", async ({ request }) => {
    const res = await request.get("/api/cron/metrics");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Unauthorized" });
  });

  test("@smoke returns Prometheus text when CRON_SECRET is set", async ({ request }) => {
    const secret = process.env.CRON_SECRET;
    test.skip(!secret?.trim(), "CRON_SECRET missing (CI sets via .env.ci).");
    const runDbBacked =
      process.env.GITHUB_ACTIONS === "true" || process.env.FORCE_CRON_METRICS_SMOKE === "1";
    test.skip(
      !runDbBacked,
      "Runs in GitHub Actions with Postgres service, or locally with Postgres + FORCE_CRON_METRICS_SMOKE=1.",
    );

    const res = await request.get("/api/cron/metrics", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("ehs_cron_job_last_run_timestamp_seconds");
    expect(text).toContain('job="reminders"');
    expect(text).toContain('job="data-retention"');
  });
});
