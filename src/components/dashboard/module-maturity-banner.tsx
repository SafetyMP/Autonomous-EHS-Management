"use client";

/**
 * R2 honesty banner (ADR-UX-002 / AC-005). role=note is mandatory.
 * Banner=Yes routes must keep this (or a successor with role=note).
 * Removal requires promotion packet + counsel — not CSS-only polish.
 */
export function ModuleMaturityBanner({
  tier,
  children,
}: {
  tier: "plumbing" | "intake" | "connected";
  children: React.ReactNode;
}) {
  const styles =
    tier === "plumbing"
      ? "border-warning bg-warning-surface text-warning"
      : tier === "connected"
        ? "border-border-strong bg-surface-muted text-text"
        : "border-border-strong bg-surface-muted text-text-muted";
  return (
    <div
      role="note"
      data-maturity-banner={tier}
      className={`rounded-lg border px-4 py-3 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}
