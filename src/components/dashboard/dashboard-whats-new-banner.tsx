"use client";

import Link from "next/link";
import { useState } from "react";
import { useOrg } from "@/components/org-context";
import { filterHighlightsForUser } from "@/lib/dashboard/productHighlights";
import {
  isWhatsNewBannerVisible,
  writeWhatsNewDismissedRelease,
} from "@/lib/dashboard/whatsNewDismiss";
import { trpc } from "@/trpc/react";

const linkClass =
  "font-medium text-emerald-900 underline underline-offset-2 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

export function DashboardWhatsNewBanner() {
  const { organizationId } = useOrg();
  const [visible, setVisible] = useState(() =>
    typeof window === "undefined" ? false : isWhatsNewBannerVisible(),
  );

  const { data: homeLayout } = trpc.organization.dashboardHomeLayout.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  if (!visible || !organizationId || !homeLayout) return null;

  const highlights = filterHighlightsForUser({
    isAdmin: homeLayout.isAdmin,
    canIntegrationRead: homeLayout.permissions.canIntegrationRead,
    persona: homeLayout.layout === "field" ? "field" : undefined,
  }).slice(0, 3);

  if (highlights.length === 0) return null;

  function dismiss() {
    writeWhatsNewDismissedRelease();
    setVisible(false);
  }

  return (
    <div
      role="region"
      aria-label="What's new"
      className="rounded-lg border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-base text-emerald-950"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="font-semibold">What&apos;s new in EHS Console</p>
          <ul className="space-y-1 text-sm text-emerald-950" role="list">
            {highlights.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className={linkClass}>
                  {item.title}
                </Link>
                <span className="text-emerald-900/80"> — {item.description}</span>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="touch-target shrink-0 self-start rounded-md border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
