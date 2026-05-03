import { env } from "@/lib/env";
import { logError, logWarn } from "@/lib/logger";

/**
 * Optional Slack/compatible webhook when cron handlers throw. Set CRON_FAILURE_WEBHOOK_URL in env.
 */
export async function notifyCronFailure(route: string, err: unknown): Promise<void> {
  const url = env.CRON_FAILURE_WEBHOOK_URL?.trim();
  const message = err instanceof Error ? err.message : String(err);

  logError("cron.handler.failed", { route, error: message });

  if (!url) {
    return;
  }

  try {
    const body = JSON.stringify({
      text: `[EHS cron] ${route} failed: ${message}`,
    });
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    if (!res.ok) {
      logWarn("cron.alert_webhook.non_ok", { route, status: res.status });
    }
  } catch (e) {
    logWarn("cron.alert_webhook.error", {
      route,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
