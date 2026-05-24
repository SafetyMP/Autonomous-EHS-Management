import Link from "next/link";
import type { ReactNode } from "react";

const ACTIONS: readonly {
  href: string;
  label: string;
  primary: boolean;
  icon: ReactNode;
}[] = [
  {
    href: "/dashboard/incidents/new",
    label: "Report incident",
    primary: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/observations/new",
    label: "Log observation",
    primary: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/permits/new",
    label: "New permit",
    primary: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/inspections/new",
    label: "Start inspection",
    primary: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-6-6m4.5 0a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0ZM9 12h3.75H15M12 21V8.25" />
      </svg>
    ),
  },
  {
    href: "/dashboard/analytics",
    label: "Metrics",
    primary: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h3.026a2 25 0 0 0 4.086 8.974H12M3 17.812c0-.621.504-1.125 1.125-1.125h5.25c1.036 0 1.959.694 2.239 1.691M21 13.087a3.752 3.752 0 0 1-5.086 6.957M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/capa",
    label: "CAPA register",
    primary: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/incidents",
    label: "Incidents",
    primary: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="m11.645 13.058 10.089-12.93a4.045 4.045 0 0 1 5.68 5.764L15.096 21.53a7.953 7.953 0 0 1-9.086 1.88M9.75 21V10.875M17.062 21H21" />
      </svg>
    ),
  },
  {
    href: "/dashboard/tasks",
    label: "Tasks & reviews",
    primary: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v11.125A9.943 9.943 0 0 1 6 21c-.621 0-1.125-.504-1.125-1.125v-13.25C4.875 5.504 6.879 4.5 12 4.5c5.121 0 7.125 1.004 7.125 2.125V19.875c0 .621-.504 1.125-1.125 1.125-.261 0-.515-.089-.716-.257A9.952 9.952 0 0 1 17.25 14.125V5.25m-13.5 0h13.5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/analytics/incidence-rates",
    label: "Incidence rates",
    primary: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25a4.5 4.5 0 0 0 4.5-4.5V6.375a4.125 4.125 0 1 1 8.25 0v2.25a4.5 4.5 0 0 0 4.5 4.5h2.25a3.375 3.375 0 0 1 3.375 3.375V19.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V16.125Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/assurance",
    label: "Assurance hub",
    primary: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/import",
    label: "CSV import",
    primary: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 shrink-0" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 13.5 3 3m0 0 3-3m-6 15V6a4.5 4.5 0 0 1 9 0v10.125M9 21h13.125" />
      </svg>
    ),
  },
] as const;

export function DashboardQuickActions() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
      {ACTIONS.map((a) => (
        <li key={a.href}>
          <Link
            href={a.href}
            className={
              a.primary
                ? "flex min-h-11 touch-target flex-row items-center justify-center gap-3 rounded-lg border-2 border-emerald-800 bg-emerald-50 px-4 py-3 text-center text-base font-semibold text-emerald-950 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                : "flex min-h-11 touch-target flex-row items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center text-base font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            }
          >
            <span className={a.primary ? "text-emerald-900" : "text-zinc-600"}>{a.icon}</span>
            {a.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
