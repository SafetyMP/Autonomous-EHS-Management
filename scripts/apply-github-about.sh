#!/usr/bin/env bash
# Apply GitHub repository About metadata (discovery-first presentation uplift).
# Requires: gh CLI authenticated with repo admin access.
# See REPO_SETUP.md § "OSS health badges & social preview".

set -euo pipefail

REPO="${1:-SafetyMP/Autonomous-EHS-Management}"

gh repo edit "$REPO" \
  --description "Self-hosted EHS software for corporate teams: incidents, corrective actions (CAPA), audits and safety reporting. PostgreSQL-backed app with a separate interactive demo." \
  --homepage "https://safetymp.github.io/Autonomous-EHS-Management/"

# GitHub caps repositories at 20 topics — replace the full set.
gh api -X PUT "repos/${REPO}/topics" \
  -H "Accept: application/vnd.github+json" \
  --input - <<'EOF'
{
  "names": [
    "ehs",
    "environmental-health-and-safety",
    "incident-management",
    "capa",
    "corrective-actions",
    "safety-management",
    "occupational-health",
    "environmental-management",
    "audits",
    "risk-assessment",
    "self-hosted",
    "open-source",
    "postgresql",
    "nextjs",
    "typescript",
    "docker",
    "github-pages"
  ]
}
EOF

echo "Updated About for ${REPO}. Verify: gh repo view ${REPO} --web"
