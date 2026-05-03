import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";

export type CommandCenterSnapshot = inferRouterOutputs<AppRouter>["analytics"]["commandCenter"];

function csvEscape(cell: string): string {
  if (/[",\n\r]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

/** Flat KPI snapshot (+ cron job rows) for Ops / SIEM ticketing — excludes activity feed prose. */
export function commandCenterSnapshotToCsv(cc: CommandCenterSnapshot): string {
  const lines: string[][] = [["section", "key", "value"]];
  lines.push(["meta", "generatedAt", cc.generatedAt]);
  const kpis = cc.kpis;
  if (!kpis) {
    return lines.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  }
  for (const [section, blob] of Object.entries(kpis)) {
    if (blob == null) continue;

    if (section === "cronHealth" && typeof blob === "object" && "jobs" in blob) {
      const jobs = blob.jobs as Array<Record<string, unknown>>;
      lines.push(["cronHealth", "jobCount", String(jobs?.length ?? 0)]);
      for (let i = 0; i < (jobs ?? []).length; i += 1) {
        lines.push(["cronHealth", `job.${i}`, JSON.stringify(jobs[i])]);
      }
      continue;
    }

    if (typeof blob !== "object" || Array.isArray(blob)) {
      lines.push([section, "value", JSON.stringify(blob)]);
      continue;
    }

    for (const [key, raw] of Object.entries(blob)) {
      const cell =
        raw != null && (typeof raw === "object" || Array.isArray(raw))
          ? JSON.stringify(raw)
          : String(raw);
      lines.push([section, key, cell]);
    }
  }
  lines.push(["meta", "activityFeedRows", String(cc.activityFeed?.length ?? 0)]);
  return lines.map((r) => r.map(csvEscape).join(",")).join("\r\n");
}
