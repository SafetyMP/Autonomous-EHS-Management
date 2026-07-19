# ADR-S-004: Threat-model expansion and demo/env fail-closed posture

**Status:** Proposed (site delivery, revision 1)
**Date:** 2026-07-19
**Program:** `ehs` (corporate revision 1)
**Requirements:** R-009 (demo/env + Context Sync hard-fail posture), R-010 (adversarial threat-model expansion)
**Related:** [ADR 0000 Threat Model](0000-threat-model.md), [ADR 0001 MCP Context Sync](0001-mcp-context-sync-strategy.md), [Context Sync enablement confirmation](../qa/context-sync-enablement-pilot-prod.md)

**Not legal advice.** Demo flags and rate-limit kill switches are operational controls; they do not replace counsel review for production claims.

## Context

Corporate handoff revision 1 records two maturation gaps:

1. **R-009 / D-012** — `DEMO_MODE` hard-fail was historically gated on `VERCEL_ENV=production` only (`src/instrumentation.ts`). Self-host and staging deploy classes could leave demo quick-sign-in active against real data. Rate limiting already fails closed per-request when `NODE_ENV=production` and Upstash is unset, but the deploy-class invariant was not proven by env-invariant unit tests for non-Vercel classes.
2. **R-010** — `specs/threat-model.yaml` adversarial surface was inbound-centric. Cron bearer, Context Sync anonymous / spoofed agent-class, and SCIM deny oracles were incomplete.

## Decision

### 1. Env-invariant demo and rate-limit policy (R-009)

`src/lib/env.ts` exports deploy-class and policy helpers that fail closed for **non-dev** deploy classes — not Vercel-only:

| Helper | Non-dev signal |
|--------|----------------|
| `resolveDeployClass` | `APP_ENV` / `DEPLOY_ENV` ∈ {staging, production, prod, pilot}; `VERCEL_ENV` ∈ {production, preview}; or `NODE_ENV=production` |
| `demoModePolicyViolation` | `DEMO_MODE=true` or `NEXT_PUBLIC_DEMO_MODE` ∈ {true, 1} without `DEMO_ALLOW_PRODUCTION=true` |
| `rateLimitBackendPolicyViolation` | Missing `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` without `RATE_LIMIT_DISABLED=true` |

These run at env module load (when validation is not skipped). Unit tests under `tests/unit/lib/env-invariant*.test.ts` prove the matrix.

### 2. Context Sync enablement confirmation (R-009)

Pilot/prod tenants must record explicit `organization.context_sync_enabled` + grant/claim posture in
[`docs/qa/context-sync-enablement-pilot-prod.md`](../qa/context-sync-enablement-pilot-prod.md).
Enablement remains opt-in (default off); session actor binding (`X-Actor-Id` = `human:{session.user.id}`) is unchanged.

### 3. Threat-model cells + adversarial oracles (R-010)

`specs/threat-model.yaml` adds baseline cells and deny cases:

| Cell | Deny oracle | Expect |
|------|-------------|--------|
| `cron_reminders` | anonymous GET `/api/cron/reminders` | 401 Unauthorized |
| `context_sync_artifacts` | anonymous list; anonymous + spoofed `X-Agent-Class` / `X-Actor-Id` | 401 sign_in_required |
| `scim_users` | anonymous GET `/api/scim/v2/Users` | 401 Missing or invalid Bearer token |
| `integration_inbound` (extra) | authenticated poison `kind` | 400 Validation failed |

`scripts/check-threat-model.sh` requires these cell IDs. `./scripts/adversarial.sh` executes the deny cases against a live base URL.

## Consequences

**Positive**

- Staging/self-host misconfig with demo flags fails at boot, not only on Vercel production.
- Adversarial tier covers cron, Context Sync, and SCIM beyond inbound-only auth cases.
- Pilot/prod Context Sync enablement has a confirmation artifact for gate G-R-009.

**Negative / residual**

- CI / sparse non-dev boots without Upstash must set `RATE_LIMIT_DISABLED=true` (documented kill switch) or provision Redis.
- `src/instrumentation.ts` still mentions Vercel; broader invariant lives in `env.ts` (instrumentation left unchanged in this ADR write set).
- Live `./scripts/adversarial.sh` still requires a running app URL.

## Verification

```bash
bash scripts/check-threat-model.sh
npx vitest run tests/unit/lib/env-invariant
./scripts/verify.sh
# when app is up:
./scripts/adversarial.sh
```
