# Agent & contributor handbook

## Merge / handoff verification bar

Run in order (fix failures before merge or handoff):

```bash
npm run verify
```

Defined as: **`eslint` → `tsc --noEmit` → `vitest run`**. Same as CI `verify` job (without Playwright).

Full check including smoke E2E:

```bash
npm run verify:all
```

## Smoke E2E (must stay green on PR)

These live in `tests/e2e/smoke/` and are the **minimum** UI checks in CI:

| Flow | Spec | Intent |
|------|------|--------|
| Marketing / home | `smoke/home.spec.ts` | App serves `/`, ISO messaging visible |
| Sign-in surface | `smoke/sign-in.spec.ts` | `/sign-in` loads and shows the form |
| Dashboard gate | `smoke/dashboard-gate.spec.ts` | Unauthenticated `/dashboard` redirects to sign-in |
| Signed-in (optional) | `auth/dashboard-signed-in.spec.ts` | Skipped unless `PLAYWRIGHT_E2E_EMAIL` / `PLAYWRIGHT_E2E_PASSWORD` are set |
| Incident submit (optional) | `auth/incident-intake.spec.ts` | Same env as signed-in; expects `db:seed` org for the user |

Run locally:

```bash
npm run test:e2e:smoke
```

Optional full E2E (includes skipped auth flow unless env is set):

```bash
npx playwright test tests/e2e
```

**Note:** Full authenticated CRUD (e.g. incident create) requires a seeded user and stable test credentials; use `db:seed` plus the optional auth spec env vars—do not weaken the auth gate smoke tests.

## Product UAT (business / compliance)

Smoke E2E proves **minimal technical health** (pages load, auth gate). It does **not** replace **business acceptance**: whether workflows hold up for field use, regulatory auditability, CAPA/escalation, and real-world friction.

For that, invoke the project skill at [`.cursor/skills/ehs-program-director-uat/SKILL.md`](.cursor/skills/ehs-program-director-uat/SKILL.md) when reviewing UX/workflows for compliance, auditability, and field usability (User Acceptance Testing from an EHS Program Director perspective).

For **staff-level code review and behavior-preserving refactors** (DRY/SOLID, Big O and readability passes, smells-first output), use [`.cursor/skills/staff-engineer-code-review/SKILL.md`](.cursor/skills/staff-engineer-code-review/SKILL.md).

For **accessible, field-ready UI** (semantic HTML / ARIA, keyboard and screen reader support, contrast and glare-friendly typography, large touch targets, offline-aware messaging, stressful-workflow cognitive load), use [`.cursor/skills/ui-ux-field-accessibility/SKILL.md`](.cursor/skills/ui-ux-field-accessibility/SKILL.md).

For **end-user manuals, SOPs, help site copy, tooltip/toast wording** (plain language for workers and managers, workflows grounded in real dashboard routes—and separate “for admins” tech notes where needed), use [`.cursor/skills/ehs-technical-writer-enablement/SKILL.md`](.cursor/skills/ehs-technical-writer-enablement/SKILL.md).

For **corporate compliance, data governance, retention/legal hold, PII/RAG handling, OSHA-sidecar and Tier II schema, and `COMPLIANCE.md` alignment** (technical controls and counsel questions—not legal advice), use [`.cursor/skills/corporate-compliance-data-governance/SKILL.md`](.cursor/skills/corporate-compliance-data-governance/SKILL.md). Indexed with other skills in [`.cursor/skills/README.md`](.cursor/skills/README.md); workspace hook: [`.cursor/rules/compliance-data-governance.mdc`](.cursor/rules/compliance-data-governance.mdc).

For **SAST, offensive application security review, and OWASP-oriented logic audits** (strict per-finding report format, minimal security fixes), use [`.cursor/skills/devsecops-sast-audit/SKILL.md`](.cursor/skills/devsecops-sast-audit/SKILL.md).

For **DevOps / SRE**—Docker/Kubernetes, Terraform or Vercel-aligned delivery, GitHub Actions deploy paths, observability, FinOps (scale-to-zero vs HA), and production runbooks **without** changing application business logic—use [`.cursor/skills/devops-sre/SKILL.md`](.cursor/skills/devops-sre/SKILL.md). Root [`Dockerfile`](Dockerfile) targets **Node 22** with Next **standalone** output for container hosts.

For **Staff Release Engineer / GitOps**—repository rulesets, workflow design, OIDC-based promotion, semantic versioning, Dependabot/supply-chain and [`REPO_SETUP.md`](REPO_SETUP.md)—use [`.cursor/skills/staff-release-gitops-architect/SKILL.md`](.cursor/skills/staff-release-gitops-architect/SKILL.md).

For **developer experience**—local/demo Postgres (`docker-compose.demo.yml`), Codespaces devcontainer, realistic `db:seed:demo` data, `DEMO_MODE` / read-only sandbox patterns, and README quick-start “storefront” updates without weakening production auth—use [`.cursor/skills/devex-engineer/SKILL.md`](.cursor/skills/devex-engineer/SKILL.md).

## CI and containers

- GitHub Actions: `.github/workflows/ci.yml` runs lint, typecheck, unit tests, and **Playwright smoke** on PRs and `main`/`master`.
- Optional **demo quick-login** E2E: set **`PLAYWRIGHT_DEMO=1`**, run **`npm run demo:up`** and **`npm run dev`** with demo `.env.local`, then `npx playwright test tests/e2e/demo` (not part of default CI).
- **Container registry:** `.github/workflows/docker-publish.yml` builds and pushes **`ghcr.io/<owner>/<repo>/ehs-web`** on pushes to `main`/`master` when app or Docker paths change.
- **Production promotion (manual, dual-gated):** `.github/workflows/cd-promote-production.yml` — `workflow_dispatch` on GitHub Environment **`production`** (required reviewers): optional Vercel `--prebuilt` deploy (token in env secret) and/or EKS rollout via **AWS OIDC** (no long-lived kubeconfig). Base manifests: `deploy/k8s/` (apply Secrets from `secret.example.yaml` template first). Repository setup: **`REPO_SETUP.md`**.
- **Terraform (AWS EKS starter):** `infra/terraform/` — VPC + EKS; run `terraform init` / `plan` / `apply` with AWS credentials; see inline comments.
- Prefer **real env validation** in a separate job later with a fixture `.env` and secrets; today `SKIP_ENV_VALIDATION=1` is used for build/test speed (tighten per org policy).

## Vercel (shipping)

- Install [Vercel CLI](https://vercel.com/docs/cli) locally: `npm i -g vercel` (or use `npx vercel`).
- Use `vercel link`, `vercel env pull`, and `vercel inspect` so staging/prod envs match what agents and humans expect.
- App routing and headers: `next.config.ts` (typed Next config). Prefer this over untracked ad hoc JSON for rewrites/headers when you add them.
- **Vercel project file:** root `vercel.ts` with `VercelConfig` from `@vercel/config/v1` (same fields as `vercel.json`; do not commit both).

## AI features (product)

- Validate **structured LLM outputs** with **Zod** before persisting.
- **RAG / uploads**: ingest → chunk → embed → store metadata; cite passages in UI when suggesting obligations or audit evidence.
- **Server API:** `rag.*` tRPC procedures — permissions `rag:read` / `rag:ingest`; migrations `0002_rag_tables.sql` / vector index; `redactExistingSource` backfills stored text/chunk minimization for sources ingested before rule changes.
- **Tool-calling**: only audited tRPC (or internal handlers), not raw SQL.
- **Gateway**: `src/lib/ai/gateway.ts`; optional OpenAI-compatible client in `src/lib/ai/openai-gateway.ts`. When `OPENAI_API_KEY` is set, `src/instrumentation.ts` registers the gateway at startup.
- **Evals:** `tests/evals/*.eval.test.ts` (golden JSON + mock gateway). Vitest aliases `server-only` to `tests/mocks/server-only.ts` so gateway code can load in Node tests.

## Parallel work

- For large features, use **separate branches or git worktrees** so multiple agents do not overwrite the same tree (backend vs UI vs tests).
