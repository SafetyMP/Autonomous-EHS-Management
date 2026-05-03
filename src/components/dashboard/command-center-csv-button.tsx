"use client";

import { commandCenterSnapshotToCsv } from "@/lib/analytics/commandCenterCsv";
import type { CommandCenterOut } from "@/lib/dashboard/commandCenterSignals";
import { dfSecondaryOutline } from "@/lib/dashboard-field-styles";

type Props = {
  organizationId: string;
  snapshot: CommandCenterOut;
};

export function CommandCenterCsvButton({ organizationId, snapshot }: Props) {
  return (
    <button
      type="button"
      className={`${dfSecondaryOutline} whitespace-nowrap sm:text-base`}
      onClick={() => {
        const csv = commandCenterSnapshotToCsv(snapshot);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `command-center-${organizationId}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      Download command center CSV
    </button>
  );
}
