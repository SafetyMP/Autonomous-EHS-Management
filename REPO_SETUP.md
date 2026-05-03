# Repository setup — GitOps & branch governance

This checklist is **manual**: GitHub org/repo settings and cloud IAM consoles. It matches the pipelines in `.github/workflows/` (`CI`, **Container image**, **Release**, **Promote production**).

**Canonical GitHub repo:** [`SafetyMP/Autonomous-EHS-Management`](https://github.com/SafetyMP/Autonomous-EHS-Management). Use IAM OIDC trust subjects such as `repo:SafetyMP/Autonomous-EHS-Management:*` scoped to **`production`** environment (see §3).

---

## 1. Repository rulesets (recommended over legacy branch protection)

Create a **ruleset** targeting **`main`** and **`master`** (or unify on one trunk branch):

| Requirement | Recommendation |
|-------------|----------------|
| **Pull requests** | Require PR before merge; block direct pushes unless bypass role is deliberate. |
| **Linear history** | Require **squash merge** only *or* require linear history (pick one policy). |
| **Status checks** | Require **`supply-chain-audit`** (runs `npm audit --omit=dev --audit-level=high` against **production transitive** vulnerabilities), **`verify`**, and **`e2e-smoke`** from workflow [`CI`](.github/workflows/ci.yml). DevDependency advisories are primarily handled by **[Dependabot](.github/dependabot.yml)**. |
| **Reviews** | Require **≥1** approving review from humans; map “AI review” via optional **Copilot** or bot checks (**GitHub does not enforce AI vs human** explicitly). |
| **Verified commits** | Enable **verified signatures** or **verified authors** where your org allows it. |
| **Bypass lists** | Keep empty for developers; optionally allow **`release`** automation only via a dedicated GitHub App or fine-grained token if `semantic-release` cannot tag (see §4). |
| **`CODEOWNERS`** | Uncomment rules in [`CODEOWNERS`](.github/CODEOWNERS) and assign **`/.github/workflows/`** etc. |

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
- **`GITHUB_TOKEN` permissions:** **`contents: write`**, **`issues: write`**, **`pull-requests: write`** — required for Releases and changelog comments.
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
| **CodeQL** (optional starter workflow) | SAST complement to `eslint`/`tsc`; add `codeql-analysis.yml` if permitted. |

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

_Last updated alongside Autonomous EHS GitOps refactor (May 2026)._
