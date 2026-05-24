# OIDC JIT (just-in-time) org membership — scaffolding

This is **not legal or IAM policy** for your enterprise. Work with **Identity, HR, and counsel** before enabling in production.

## What it does

When **`OIDC_JIT_ENABLED=true`** and **`OIDC_JIT_DEFAULT_ORG_ID`** point to an existing organization, users who sign in with the configured **Generic OAuth** provider (see README Enterprise SSO) can receive a **membership** row linking them to that org and role **if they do not already have one** in that org.

Email/password users are **not** auto-linked (no matching `account.provider_id` for the OIDC provider).

## Required environment

| Variable | Meaning |
|----------|---------|
| `OIDC_JIT_ENABLED` | Literal `true` to turn on (anything else is off). |
| `OIDC_JIT_DEFAULT_ORG_ID` | UUID of an **existing** `organization` row. |
| `OIDC_JIT_ROLE_SLUG` | Optional; defaults to `admin`. Role must exist under that org. |

You must still configure **`OIDC_DISCOVERY_URL`**, **`OIDC_CLIENT_ID`**, **`OIDC_CLIENT_SECRET`**, and optional **`OIDC_PROVIDER_ID`** for SSO per README.

## Multi-org claim rules (PortCo)

When **`oidc_jit_claim_rule`** rows exist for your deployment, the session hook matches IdP JWT claim values (default claim **`groups`**, read from stored `id_token`) to **organization + role** before falling back to **`OIDC_JIT_DEFAULT_ORG_ID`**.

Configure rules at **`/dashboard/integrations`** → PortCo identity panel (org admin). Fail closed when no rule matches and no default org is set.

## Operational checklist

- [ ] Default org exists and is the correct tenant for **all** IdP users reaching this app (or use IdP group filtering **before** enabling JIT).
- [ ] Default role slug exists per org and matches **least privilege** (avoid `admin` in production without review).
- [ ] IdP emits stable `email` / `sub`; review **account linking** behavior with Better Auth.
- [ ] Monitor **`audit_log`** for `oidc_jit.membership_linked`.
- [ ] Document support path when a user should **not** get the default org (HR/offboarding).

## Implementation

Server hook: [`databaseHooks.session.create.after`](https://www.better-auth.com/docs/concepts/database#database-hooks) in [`src/server/auth.ts`](../src/server/auth.ts) calls [`provisionOidcJitMembershipIfEnabled`](../src/server/services/oidcJitProvisioning.ts).
