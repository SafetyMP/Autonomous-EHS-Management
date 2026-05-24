import Link from "next/link";
import { HOME_FEATURE_HIGHLIGHTS } from "@/lib/dashboard/productHighlights";

export default function HomePage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col items-center px-4 py-16 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-inset sm:py-24"
    >
      <div className="w-full max-w-3xl space-y-12 text-center">
        <div className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Autonomous EHS
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Autonomous compliance operations for ISO 45001 &amp; ISO 14001
          </h1>
          <p className="text-lg leading-relaxed text-zinc-800 sm:text-base">
            Incident tracking, CAPA, environmental obligations, audits, and role-based access—with
            scheduled reminders, integration ingest, and optional proposal-only AI. Material changes
            require human approval through normal workflows (not silent automation).
          </p>
          <p className="text-sm leading-relaxed text-zinc-700">
            <strong className="text-zinc-900">Autonomous</strong> here means operations keep moving
            via cron, escalations, and field outbox replay—not LLM-owned approvals or regulatory
            filings.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <Link
              href="/sign-in"
              className="inline-flex min-h-11 touch-target items-center justify-center rounded-lg bg-emerald-800 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Sign in to EHS Console
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

        <section aria-labelledby="home-features-heading" className="text-left">
          <h2 id="home-features-heading" className="text-center text-xl font-semibold text-zinc-900">
            What&apos;s in the console
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-700">
            Lifecycle navigation and new program hubs for assurance, emergency prep, and change
            management.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2" role="list">
            {HOME_FEATURE_HIGHLIGHTS.map((item) => (
              <li key={item.id}>
                <article className="h-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                  <h3 className="text-base font-semibold text-emerald-950">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-700">{item.description}</p>
                </article>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="home-adopters-heading"
          className="rounded-lg border border-zinc-200 bg-white px-5 py-6 text-left shadow-sm"
        >
          <h2 id="home-adopters-heading" className="text-lg font-semibold text-zinc-900">
            Built for your team
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700" role="list">
            <li>
              <strong className="text-zinc-900">Self-host IT</strong> — tenant-owned Postgres,
              predictable infra, data residency in your cloud account.
            </li>
            <li>
              <strong className="text-zinc-900">Systems integrators</strong> — HRIS/LMS inbound
              webhooks and connector mappings without reading internal APIs.
            </li>
            <li>
              <strong className="text-zinc-900">PortCo pilots</strong> — scoped IMS rollout from
              incidents through CAPA, contractors, and evidence.
            </li>
          </ul>
          <p className="mt-4 text-center">
            <Link
              href="/sign-in"
              className="inline-flex min-h-11 touch-target items-center justify-center rounded-lg bg-emerald-800 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Sign in to EHS Console
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
