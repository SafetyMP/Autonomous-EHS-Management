# Open source license and TCO snapshot

This repository ships under the **Apache License 2.0** — see the root [`LICENSE`](../LICENSE) file. You may run, modify, and redistribute the software under those terms; production deployments still need your own **counsel / compliance** review (see [`COMPLIANCE.md`](../COMPLIANCE.md)).

## Evergreen open source (long-term maintenance)

Autonomous EHS is positioned as a **long-lived OSS product**, not a throwaway demo:

- **Schema in git** — Drizzle migrations are the deploy path; PostgreSQL remains the auditable system of record.
- **Public quality bar** — `npm run verify` on `main` matches CI ([`AGENTS.md`](../AGENTS.md)).
- **Honest scope** — module maturity and roadmap are published ([`module-maturity.md`](./module-maturity.md), [`ROADMAP.md`](../ROADMAP.md)).
- **Governance** — maintainers, releases, security, and fork expectations: [`GOVERNANCE.md`](../GOVERNANCE.md).

**Not included:** unlimited free support, zero ops cost, or a separate LTS branch (adopters pin releases and test upgrades themselves).

## What “cheap but effective” means here

Autonomous EHS optimizes for **tenant-owned infrastructure** and **predictable ops cost**:

- **Application:** self-host (Docker/Kubernetes per [`deploy/k8s/`](../deploy/k8s/) and [`AGENTS.md`](../AGENTS.md)) or use managed hosts (e.g. Vercel) with your Postgres bill separated from per-user SaaS markup.
- **Data:** PostgreSQL is the **system of record** — warehouse and BI tools read your database or exports; you are not locked into a vendor’s reporting SKU for basic program metrics.
- **AI (optional):** proposals go through **permission-gated** procedures and **Zod** validation; smaller models and optional **local / VPC** intake paths reduce inference spend vs “always GPT-4” defaults (see [`docs/ai-governed-intake.md`](./ai-governed-intake.md)).

This is **not** “free forever with zero ops”: you still fund compute, backups, monitoring, IAM, and support for the people using the system.

## Illustrative seat-cost comparison (inspection-first SaaS)

**SafetyCulture** publishes a **free** tier for small teams (e.g. up to **10** users, **5** active inspection templates, shared storage limits) and paid **Premium** at roughly **$24–$29 per seat / month** (annual vs monthly) for broader features — see [SafetyCulture pricing](https://safetyculture.com/pricing) and [Free vs Premium](https://help.safetyculture.com/en-US/000867/).

| Team size (full seats) | Indicative Premium cost / yr (USD) |
|------------------------|-------------------------------------|
| 25 | ~25 × $288 ≈ **$7,200** (at ~$24/seat/mo annual) |
| 100 | ~100 × $288 ≈ **$28,800** |
| 500 | ~500 × $288 ≈ **$144,000** |

Numbers are **order-of-magnitude** only: real invoices include tax, bundles, enterprise discounts, storage overages, and integration tiers. SafetyCulture’s strength is **fast frontline adoption** on inspections; Autonomous EHS is positioned as a **broader IMS-style console** (incidents, CAPA, permits, compliance routers) with **self-host** economics — compare **total cost** (software + people + risk) not sticker price alone.

## When to choose self-hosted Autonomous EHS vs freemium inspection tools

- Prefer **Autonomous EHS** when you need **one auditable chain** from event → investigation/CAPA → evidence, **RBAC** aligned to roles, **retention / legal hold** hooks, and **data residency** under your cloud account.
- Prefer **template-first inspection apps** when the primary win is **checklist digitization** and **guaranteed mobile polish** on day one with minimal internal IT.

For pilot framing and ROI language, use [`docs/procurement-readiness.md`](./procurement-readiness.md). **Self-host path:** [`docs/self-host-quickstart.md`](./self-host-quickstart.md). **Project governance:** [`GOVERNANCE.md`](../GOVERNANCE.md).
