import Link from "next/link";

export function DashboardKpiTile({
  title,
  value,
  href,
  emphasize,
  sublabel,
}: {
  title: string;
  value: number | string;
  href: string;
  emphasize?: boolean;
  sublabel?: string;
}) {
  const showValue = typeof value === "number" || (typeof value === "string" && value.trim() !== "");
  const display = showValue ? value : "—";

  return (
    <Link
      href={href}
      data-kpi-tile
      className={`block min-h-[5.75rem] rounded-xl border bg-white p-4 shadow-sm transition-colors hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
        emphasize ? "border-amber-400 ring-1 ring-amber-200/80" : "border-zinc-200"
      }`}
    >
      <p className="text-sm font-medium text-zinc-600">{title}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">{display}</p>
      {sublabel ? <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{sublabel}</p> : null}
    </Link>
  );
}
