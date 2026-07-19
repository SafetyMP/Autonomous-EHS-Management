#!/usr/bin/env bash
# RR-CF-001 / AC-CF-A003 / G-CF-RR-001 — forbid WCAG 3 conformance claim verbs.
# Scans docs/**/*.md, src/**/*.{ts,tsx}, _specialist_packets/*.json via claim-lint.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
exec node scripts/claim-lint.mjs --wcag3
