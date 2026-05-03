import Link from "next/link";

export default function HomePage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col items-center justify-center px-4 py-24 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-inset"
    >
      <div className="max-w-lg text-center space-y-6">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Governed EHS
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          EHS management aligned with ISO 45001 &amp; ISO 14001
        </h1>
        <p className="text-lg leading-relaxed text-zinc-800 sm:text-base">
          Incident tracking, environmental aspects, compliance obligations, audits,
          and role-based access— with assisted workflows, scheduled reminders, and
          human approval for material changes (not silent automation).
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            href="/sign-in"
            className="inline-flex min-h-11 touch-target items-center justify-center rounded-lg bg-emerald-800 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex min-h-11 touch-target items-center justify-center rounded-lg border-2 border-zinc-400 bg-white px-6 py-3 text-base font-semibold text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            Create account
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 touch-target items-center justify-center rounded-lg px-6 py-3 text-base font-semibold text-emerald-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
