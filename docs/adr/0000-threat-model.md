# ADR 0000: Threat Model — Caller, Trust Boundary, Authentication

**Status:** Accepted  
**Date:** 2026-07-13  
**Product:** Autonomous EHS Management System

## Context

EHS inbound integration and cron routes accept authenticated callers only. Cooperative Playwright smoke validates configured flows. Tier-3 adversarial tests unauthenticated inbound integration posts.

See `specs/threat-model.yaml` and `scripts/adversarial.sh`.

## Decision

### Principals

| Principal | Routes |
|-----------|--------|
| `anonymous` | none on integration inbound |
| `integration_service` | bearer/integration secret on inbound webhook |
| `cron_scheduler` | `CRON_SECRET` bearer on cron routes |

### Trust boundary

`POST /api/integration/inbound` requires integration authentication before payload processing.

### Authentication

API route validates integration credentials; missing auth → `401 Unauthorized`.

## References

- `specs/threat-model.yaml`, `scripts/adversarial.sh`
