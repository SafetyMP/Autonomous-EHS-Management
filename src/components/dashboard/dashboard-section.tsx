import type { ReactNode } from "react";

export function DashboardSection({
  title,
  description,
  id,
  actions,
  children,
  variant = "default",
}: {
  title: string;
  description?: string;
  id?: string;
  actions?: ReactNode;
  variant?: "default" | "muted";
  children: ReactNode;
}) {
  const surface =
    variant === "muted"
      ? "border border-zinc-200 bg-zinc-50/90"
      : "border border-zinc-200 bg-white shadow-sm";

  return (
    <section
      aria-labelledby={id ?? undefined}
      className={`rounded-lg p-5 sm:p-6 ${surface}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={id} className="text-lg font-semibold tracking-tight text-zinc-900">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-zinc-600">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
