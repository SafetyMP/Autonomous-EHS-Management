"use client";

import type { ReactNode } from "react";
import { Children, isValidElement } from "react";

/**
 * R2 honesty banner (ADR-UX-002 / AC-005) + Calm Focus chrome (ADR-UX-007).
 * role=note is mandatory. Banner=Yes routes must keep this (or a successor with
 * role=note). Removal / dismiss requires promotion packet + counsel — not polish.
 *
 * Progressive disclosure: long body only collapses inside <details>; outer chrome
 * and tier summary stay visible (adversary CR-4 / ADR-UX-007 §3).
 */

const TIER_LABEL: Record<"plumbing" | "intake" | "connected", string> = {
  plumbing: "Plumbing",
  intake: "Intake",
  connected: "Connected",
};

/** Collapsed summary keeps tier honesty visible without opening the body. */
const TIER_SUMMARY: Record<"plumbing" | "intake" | "connected", string> = {
  plumbing: "Plumbing — programme aid; not Core workflow depth",
  intake: "Intake — not production-ready automation",
  connected: "Connected — governed register; not Core switching cost",
};

/** ~2 lines at desktop content width (ADR-UX-007 §3). */
const LONG_BODY_CHARS = 100;

function textFromChildren(children: ReactNode): string {
  if (children == null || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(textFromChildren).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(children)) {
    return textFromChildren(children.props.children);
  }
  return Children.toArray(children).map(textFromChildren).join("");
}

function shouldDisclose(
  tier: "plumbing" | "intake" | "connected",
  text: string,
): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();
  const long =
    normalized.length > LONG_BODY_CHARS ||
    (normalized.match(/\n/g)?.length ?? 0) >= 2;
  if (!long) return false;
  // connected + intake per §5.2; plumbing may use the same pattern (prominence via border).
  return tier === "connected" || tier === "intake" || tier === "plumbing";
}

export function ModuleMaturityBanner({
  tier,
  children,
}: {
  tier: "plumbing" | "intake" | "connected";
  children: ReactNode;
}) {
  const bodyText = textFromChildren(children);
  const disclose = shouldDisclose(tier, bodyText);

  // Calm Focus palette: slate-100 / slate-700; left accent teal-600 (connected/intake)
  // or --warning for plumbing so prominence ≥ connected (AC-CF-V008).
  const accentBorder =
    tier === "plumbing"
      ? "border-l-warning"
      : "border-l-primary"; /* teal-600 token */

  return (
    <div
      role="note"
      data-maturity-banner={tier}
      className={`maturity-banner rounded-lg border border-border border-l-4 bg-slate-100 px-4 py-3 text-sm text-slate-700 ${accentBorder}`}
    >
      <p className="font-semibold text-slate-700" data-maturity-tier-label={tier}>
        {TIER_LABEL[tier]}
      </p>
      {disclose ? (
        <details data-maturity-disclosure className="maturity-banner-disclosure mt-1">
          <summary className="cursor-pointer touch-target py-1 font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2">
            {TIER_SUMMARY[tier]}
          </summary>
          <div className="mt-2 text-slate-700">{children}</div>
        </details>
      ) : (
        <div className="mt-1 text-slate-700">{children}</div>
      )}
    </div>
  );
}
