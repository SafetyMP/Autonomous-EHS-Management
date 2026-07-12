# Repository setup — GitOps & branch governance

This checklist is **manual**: GitHub org/repo settings and cloud IAM consoles. It matches the pipelines in `.github/workflows/` (`CI`, **Container image**, **Release**, **Promote production**).

**Clone path:** If your local folder name ends with a **trailing space** (unquoted paths and some CI copy/paste flows), shells and Node tooling may mis-resolve the workspace—**rename the directory** or always `cd`/`open` with a **quoted** path (e.g. `"./Autonomous EHS Management System "`).

**Canonical GitHub repo:** [`SafetyMP/Autonomous-EHS-Management`](https://github.com/SafetyMP/Autonomous-EHS-Management). Use IAM OIDC trust subjects such as `repo:SafetyMP/Autonomous-EHS-Management:*` scoped to **`production`** environment (see §3).

### Repository About (topics are not committed to Git)

**Topics** live under **repository → ⚙️ (gear) → Topics** or **Settings → General** (depending on GitHub UI). GitHub caps **about 20** topics—trim if needed.

Suggested topics for discoverability:

`ehs` · `safety-management` · `occupational-health` · `incident-management` · `environmental-health-and-safety` · `capa` · `iso-45001` · `compliance` · `nextjs` · `react` · `typescript` · `postgresql` · `drizzle-orm` · `trpc` · `better-auth` · `playwright-testing` · `docker` · `kubernetes` · `gitops`

**Recommended short description** (About field):

> Web console for safety teams: incidents, corrective/preventive action (CAPA) plans, metrics, documents, training, audits—role-aware, PostgreSQL-backed.

With [**GitHub CLI**](https://cli.github.com/) authenticated against the repo, prefer the consolidated script (replaces all topics, stays within the 20-topic cap):

```bash
bash scripts/apply-github-about.sh
```

(Add `--homepage https://…` is included in the script; currently `https://autonomous-ehs-management.vercel.app`.)

---

## 1. Repository rulesets (recommended over legacy branch protection)

Create a **ruleset** targeting **`main`** and **`master`** (or unify on one trunk branch):

| Requirement | Recommendation |
|-------------|----------------|
| **Pull requests** | Require PR before merge; block direct pushes unless bypass role is deliberate. |
| **Linear history** | Require **squash merge** only *or* require linear history (pick one policy). |
| **Status checks** | Require **`supply-chain-audit`** (runs `npm audit --omit=dev --audit-level=high` against **production transitive** vulnerabilities), **`verify`**, and **`e2e-smoke`** from workflow [`CI`](.github/workflows/ci.yml). Optionally require **`Analyze`** from [`CodeQL`](.github/workflows/codeql-analysis.yml) if Advanced Security is enabled. After the first run, optionally require **`Scorecard analysis`** from [`OpenSSF Scorecard`](.github/workflows/scorecard.yml). DevDependency advisories are primarily handled by **[Dependabot](.github/dependabot.yml)**. |
| **Reviews** | Require **≥1** approving review from humans; map “AI review” via optional **Copilot** or bot checks (**GitHub does not enforce AI vs human** explicitly). |
| **Verified commits** | Enable **verified signatures** or **verified authors** where your org allows it. |
| **Bypass lists** | Keep empty for developers; optionally allow **`release`** automation only via a dedicated GitHub App or fine-grained token if `semantic-release` cannot tag (see §4). |
| **`CODEOWNERS`** | Ensure `@SafetyMP/…` teams in [`.github/CODEOWNERS`](.github/CODEOWNERS) exist under the org—or substitute `@username`/team slugs—so rulesets can require owner review. |

**CI database (Playwright):** the **`e2e-smoke`** job starts **PostgreSQL (pgvector)**, runs **`npm run db:migrate`** and **`npm run db:seed:ci`**, then smoke tests (including signed-in). Forked PRs from untrusted contributors should not receive repo secrets unless your org explicitly allows it.

---

## 2. GitHub Environments

### `production`

1. **Settings → Environments → New environment:** `production`
2. **Deployment branches:** restrict to **`main`** (and **`master`** only if still in use).
3. **Required reviewers:** at least two people recommended for segregated-duty; minimum one per org policy.
4. **Wait timer:** optional cool-down between approval and deployment.
5. **Secrets**
   - **`VERCEL_TOKEN`** — rotate regularly; scopes limited to deployment. Stored here (environment-scoped), **not** committed.
6. **Variables**
   - **`VERCEL_ORG_ID`**, **`VERCEL_PROJECT_ID`** — from `.vercel/project.json` (`vercel link`).
   - **`AWS_DEPLOY_ROLE_ARN`** — IAM role trusted by GitHub OIDC for EKS rollout (see §3).
   - **`AWS_REGION`**
   - **`EKS_CLUSTER_NAME`**
   - **`K8S_NAMESPACE`** — default in manifests is **`ehs-prod`** (`deploy/k8s/` alignment).

**Cron metrics probe (optional):** [`.github/workflows/cron-metrics-probe.yml`](.github/workflows/cron-metrics-probe.yml) runs **`workflow_dispatch`** against a URL you supply. Prefer **`CRON_SECRET`** as an **Environment** secret (`staging` / `production`) when org policy favors scoped automation credentials—the checked-in workflow reads a **repository** secret so forks keep a frictionless manual path without environment approval gates on each run.

Issue template links: [`.github/ISSUE_TEMPLATE/config.yml`](.github/ISSUE_TEMPLATE/config.yml).

---

## 3. OIDC — AWS → EKS (zero long-lived kubeconfig)

**Remove reliance on historical `KUBE_CONFIG_B64` secrets.** Promotion uses [`aws-actions/configure-aws-credentials`](https://github.com/aws-actions/configure-aws-credentials) **only on** [`cd-promote-production.yml`](.github/workflows/cd-promote-production.yml).

1. Create an **IAM OIDC provider** for **`token.actions.githubusercontent.com`** if missing.
2. Create an IAM **role** (e.g. `github-ehs-eks-rollout`) with trust policy restricting:
   - **`sub`** / **`repository`** / **`ref`** patterns (e.g. `repo:SafetyMP/Autonomous-EHS-Management:ref:refs/heads/main`)  
   - Optional: require **`repository_owner`** claim and environment via [`job_workflow`](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect) **`environment:production`** in the JWT for defense in depth (condition on `"job_workflow_*"` / `*` sub-formats documented for your Org).
3. Attach **minimal** policies to **update kube rollout** via EKS access:
   - Prefer **EKS access entries / IAM Roles for Kubernetes RBAC mapping** (`eks DescribeCluster`, `sts:GetCallerIdentity`, and kubectl auth via **`aws eks update-kubeconfig`**).
   - Do **not** grant `iam:*`; scope to the single cluster ARN if possible.
4. Store that role ARN in **`AWS_DEPLOY_ROLE_ARN`** (environment **`production`** variable).

---

## 4. Releases & `semantic-release`

Workflow: [`.github/workflows/release.yml`](.github/workflows/release.yml) + [`.releaserc.json`](.releaserc.json).

- **Conventional Commits:** `feat:`, `fix:`, etc. Squash-merge PR titles should contain a compliant subject line.
- **`GITHUB_TOKEN` permissions:** **`contents: write`**, **`issues: write`**, **`pull-requests: write`** — required for Releases and changelog commits ([`CHANGELOG.md`](CHANGELOG.md) updates use **`[skip ci]`** in the git plugin message so trunk CI is not rerun for the housekeeping commit alone).
- If Rulesets block tag pushes from `GITHUB_TOKEN`, add a **`release`** bypass for the **`Release`** workflow or switch to a **GitHub App** installation token documented out-of-repo.

---

## 5. Vercel CLI deploy (trust model)

Inbound **GitHub Actions → Vercel** deployments follow [Vercel’s GitHub Actions guide](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel) (`vercel pull` / `vercel build` / `vercel deploy --prebuilt`).

**Vercel OIDC federation** documented today centres on **outbound** access from **Vercel workloads** to AWS/GCP/Azure (`VERCEL_OIDC_TOKEN`). It **does not** replace `VERCEL_TOKEN` for Actions-based deploy auth at the time of writing — store a **short-lived rotated** PAT as **`production`** secret **`VERCEL_TOKEN`**.

Avoid double-shipping prod: disable automatic **Production** deployments from Git if Actions is canonical, **or** run Actions only when promotion is deliberate.

---

## 6. GitHub Advanced Security / supply chain (org-level)

Where licensed:

| Capability | Purpose |
|-----------|---------|
| **Dependabot alerts** | PRs filed via [`.github/dependabot.yml`](.github/dependabot.yml). |
| **Secret scanning + push protection** | Block leaked secrets. |
| **CodeQL** ([`codeql-analysis.yml`](.github/workflows/codeql-analysis.yml)) | SAST complement to `eslint`/`tsc`; pin the **`Analyze`** job in branch rulesets if it should gate merges once Advanced Security is available. |
| **OpenSSF Scorecard** ([`scorecard.yml`](.github/workflows/scorecard.yml)) | Weekly and push supply-chain posture; publishes to [scorecard.dev](https://scorecard.dev) for the README badge after the first successful run. |

**Artifact attestations** (build provenance pushed with the image):

- Applies to **`Container image`** workflow (see **`actions/attest-build-provenance`** notes in GitHub docs).
- **Private repos**: attestations generally require appropriate **Enterprise** SKU (see Actions docs).
- Verification: **`gh attestation verify oci://…`** (consult current CLI docs).

---

## 7. SLSA-aligned container metadata

[`docker-publish.yml`](.github/workflows/docker-publish.yml) ships **`provenance: mode=max`**, **`sbom: true`**, and attestations **`push-to-registry: true`** for **`ghcr.io/.../ehs-web`**.

Downstream Admission / policy engines (Kyverno, Ratify, Sigstore Admission) consume these **subject digests**.

---

## 8. Rollback playbook (high level)

- **Image:** rerun **Promote production** with **`image_tag`** set to prior **immutable SHA**.
- **Vercel:** redeploy earlier git ref via Vercel UI or rerun workflow from known-good commit (**document your source of truth**).

---

## 9. License & community surfaces (repo root)

| File | Notes |
|------|--------|
| [`LICENSE`](LICENSE) | **Apache License 2.0**. **`package.json`** `"license"` must stay **`Apache-2.0`** (**SPDX**). |
| [`GOVERNANCE.md`](GOVERNANCE.md) | Evergreen OSS: maintainers, merge bar, releases, security, forks. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Entry path for contributors; merge bar stays **[`AGENTS.md`](AGENTS.md)**. |
| [`SECURITY.md`](SECURITY.md) | Responsible disclosure — enable **Security → Private vulnerability reporting** on the GitHub repo. |

---

## 10. OSS health badges & social preview

### Repository About (run once after clone or org transfer)

Apply the description, homepage, and topics from § **Repository About** at the top of this file (removes the legacy `oepn` typo topic and demo credentials from the About field). GitHub caps repositories at **20 topics** — use the consolidated script:

```bash
bash scripts/apply-github-about.sh
```

Or manually with [`gh`](https://cli.github.com/) (same end state as the script):

### Social preview image

1. Source asset (committed): [`docs/assets/github-social-preview.png`](docs/assets/github-social-preview.png) (1280×640).
2. Upload: **Settings → General → Social preview** on the GitHub repo (or drag the PNG onto the About card in the web UI).
3. Verify: paste the repo URL into Slack/LinkedIn and confirm the custom card renders.

### OpenSSF Best Practices Badge (Passing)

Self-certify at [bestpractices.dev](https://www.bestpractices.dev/en) (free; maintainer account required):

1. **Add project** → enter repo URL `https://github.com/SafetyMP/Autonomous-EHS-Management`.
2. Work through **Passing** criteria; cite these in-repo evidence URLs:

| Criterion area | Evidence in this repo |
|----------------|----------------------|
| Description & interaction | [README.md](README.md), [docs/README.md](docs/README.md) |
| Contribution process | [CONTRIBUTING.md](CONTRIBUTING.md), [`.github/pull_request_template.md`](.github/pull_request_template.md) |
| Vulnerability reporting | [SECURITY.md](SECURITY.md) (private advisory path enabled) |
| Build & test | [`.github/workflows/ci.yml`](.github/workflows/ci.yml), `npm run verify` in [AGENTS.md](AGENTS.md) |
| Static analysis | [`.github/workflows/codeql-analysis.yml`](.github/workflows/codeql-analysis.yml) |
| Supply-chain scorecard | [`.github/workflows/scorecard.yml`](.github/workflows/scorecard.yml) |
| Dependency updates | [`.github/dependabot.yml`](.github/dependabot.yml) |
| License | [LICENSE](LICENSE) (Apache-2.0) |

3. When **Passing** is awarded, add the badge Markdown from the BadgeApp UI to [README.md](README.md) (hero badge row, after the Release shield).
4. Optional next step: pursue **OpenSSF Baseline** on the same project entry.

---

## 11. Cursor IDE tool connections (optional)

Some teams attach **Cursor** MCP servers (Vercel, Neon, Slack, AWS/Azure helpers, docs proxies) or use the Cursor SDK for **internal** automation. These do **not** replace GitHub **Environment** approvals, **`VERCEL_TOKEN`**, IAM OIDC, or kubectl RBAC—they are tooling around the same APIs.

Canonical guidance tying MCP scope to Drizzle migrations, preview DBs, and cron behavior on **Vercel vs Kubernetes** lives in **[`docs/cursor-tool-connections-deployment.md`](docs/cursor-tool-connections-deployment.md)**. Do not commit production secrets into MCP config or prompts.

---

_Last updated alongside Autonomous EHS GitOps refactor (May 2026)._
