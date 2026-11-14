import Link from "next/link";
import { HOME_FEATURE_HIGHLIGHTS } from "@/lib/dashboard/productHighlights";

export default function HomePage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col items-center bg-background px-4 py-16 text-foreground outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset sm:py-24"
    >
      <div className="w-full max-w-3xl space-y-12 text-center">
        <div className="space-y-5">
          <p className="font-display text-sm font-medium uppercase tracking-wide text-primary">
            Autonomous EHS
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Corporate safety, from incident to verified corrective action
          </h1>
          <p className="text-lg leading-relaxed text-foreground sm:text-base">
            Give corporate teams a shared view of incidents, corrective and preventive actions (CAPA),
            environmental obligations, and audits. Run the application on your own infrastructure
            with role-based access and human approval for material changes.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            <strong className="text-foreground">Autonomous</strong> here means operations keep moving
            via cron, escalations, and field outbox replay—not LLM-owned approvals or regulatory
            filings.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <Link href="/sign-in" className="btn-primary">
              Sign in to EHS Console
            </Link>
            <Link href="/sign-up" className="btn-secondary">
              Create account
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 touch-target items-center justify-center rounded-lg px-6 py-3 text-base font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <section aria-labelledby="home-features-heading" className="text-left">
          <h2
            id="home-features-heading"
            className="text-center text-xl font-semibold text-foreground"
          >
            What&apos;s in the console
          </h2>
          <p className="mt-2 text-center text-sm text-text-muted">
            A corporate overview, grouped work areas, and a connected incident-to-corrective-action
            journey help teams find priorities and follow through.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2" role="list">
            {HOME_FEATURE_HIGHLIGHTS.map((item) => (
              <li key={item.id}>
                <article className="h-full rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
                  <h3 className="text-base font-semibold text-primary">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-muted">{item.description}</p>
                </article>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="home-adopters-heading"
          className="rounded-[var(--radius-card)] border border-border bg-surface px-5 py-6 text-left shadow-[var(--shadow-card)]"
        >
          <h2 id="home-adopters-heading" className="text-lg font-semibold text-foreground">
            Built for your team
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-text-muted" role="list">
            <li>
              <strong className="text-foreground">Corporate EHS teams</strong> — review priorities,
              assign corrective actions, and follow evidence through verification.
            </li>
            <li>
              <strong className="text-foreground">IT and integration teams</strong> — self-host with
              PostgreSQL and connect HRIS/LMS systems through documented webhooks.
            </li>
            <li>
              <strong className="text-foreground">Site and assurance teams</strong> — manage incidents,
              contractors, audits, and supporting programme records.
            </li>
          </ul>
          <p className="mt-4 text-center">
            <Link href="/sign-in" className="btn-primary">
              Sign in to EHS Console
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
