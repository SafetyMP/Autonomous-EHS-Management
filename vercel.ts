import type { VercelConfig } from "@vercel/config/v1";

/** Typed Vercel project config (compiled to `vercel.json` on deploy). Extend with rewrites, crons, etc. */
export const config: VercelConfig = {
  framework: "nextjs",
  crons: [
    {
      path: "/api/cron/reminders",
      schedule: "0 8 * * *",
    },
    {
      path: "/api/cron/data-retention",
      schedule: "30 9 * * *",
    },
  ],
};
