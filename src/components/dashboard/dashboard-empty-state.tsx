import Link from "next/link";

export function DashboardEmptyState({
  title,
  description,
  primaryHref,
  primaryLabel,
}: {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
}) {
  return (
    <div
      role="region"
      aria-label={title}
      className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-10 text-center"
    >
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-base text-zinc-600">{description}</p>
      <Link
        href={primaryHref}
        className="mt-5 inline-flex min-h-11 touch-target items-center justify-center rounded-lg bg-emerald-800 px-5 py-2 text-base font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
      >
        {primaryLabel}
      </Link>
    </div>
  );
}
