#!/usr/bin/env bash
# Apply GitHub repository About metadata (discovery-first presentation uplift).
# Requires: gh CLI authenticated with repo admin access.
# See REPO_SETUP.md § "OSS health badges & social preview".

set -euo pipefail

REPO="${1:-SafetyMP/Autonomous-EHS-Management}"

gh repo edit "$REPO" \
  --description "Web console for safety teams: incidents, CAPA plans, metrics, documents, training, audits—role-aware, PostgreSQL-backed." \
  --homepage "https://autonomous-ehs-management.vercel.app"

# GitHub caps repositories at 20 topics — replace the full set (removes legacy "oepn" typo).
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
    "nextjs",
    "react",
    "typescript",
    "postgresql",
    "drizzle-orm",
    "trpc",
    "better-auth",
    "playwright-testing",
    "docker",
    "kubernetes"
  ]
}
EOF

echo "Updated About for ${REPO}. Verify: gh repo view ${REPO} --web"
