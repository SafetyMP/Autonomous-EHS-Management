#!/usr/bin/env bash
# Apply GitHub repository About metadata (discovery-first presentation uplift).
# Requires: gh CLI authenticated with repo admin access.
# See REPO_SETUP.md § "OSS health badges & social preview".

set -euo pipefail

REPO="${1:-SafetyMP/Autonomous-EHS-Management}"

gh repo edit "$REPO" \
  --description "Open-source EHS web console: incidents, CAPA, metrics, documents, training, and audits—role-aware, PostgreSQL-backed, self-hostable." \
  --homepage "https://autonomous-ehs-management.vercel.app"

# GitHub caps repositories at 20 topics — replace the full set.
gh api -X PUT "repos/${REPO}/topics" \
  -H "Accept: application/vnd.github+json" \
  --input - <<'EOF'
{
  "names": [
    "ehs",
    "safety-management",
    "occupational-health",
    "incident-management",
    "environmental-health-and-safety",
    "capa",
    "iso-45001",
    "compliance",
    "open-source",
    "self-hosted",
    "gitops",
    "nextjs",
    "react",
    "typescript",
    "postgresql",
    "drizzle-orm",
    "trpc",
    "better-auth",
    "docker",
    "kubernetes"
  ]
}
EOF

echo "Updated About for ${REPO}. Verify: gh repo view ${REPO} --web"
