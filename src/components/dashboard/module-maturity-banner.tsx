"use client";

/** Inline banner for modules in Plumbing / intake-only maturity tier. */
export function ModuleMaturityBanner({
  tier,
  children,
}: {
  tier: "plumbing" | "intake";
  children: React.ReactNode;
}) {
  const styles =
    tier === "plumbing"
      ? "border-amber-300 bg-amber-50 text-amber-950"
      : "border-zinc-300 bg-zinc-50 text-zinc-800";
  return (
    <div
      role="note"
      className={`rounded-lg border px-4 py-3 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}
