# Security policy

## Supported versions

| Area        | Supported |
|------------|-----------|
| Latest `main` | Yes       |
| Prior release tags | Org policy |

## Reporting a vulnerability

**Do not** open a public GitHub issue for active security findings.

Use one of:

- **GitHub [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)** for this repository (**Report a vulnerability** on the Security tab).
- Your **contractual / security channel** with SafetyMP (do not disclose active exploits on a public issue).

Include: affected routes or components, reproduction steps, impact, and suggested fix if any.

We aim to acknowledge within **7 business days**; timelines for fix and disclosure depend on severity and coordinated disclosure with your security team.

## Scope (application)

Out of scope unless agreed in writing: third-party SaaS-only issues, generic dependency advisories already tracked by Dependabot (see PRs / `npm audit` policy in CI), social engineering.

## Credentials

Never commit secrets. Use `.env*` examples only; rotate any credential that was ever pasted into an issue or PR.

The committed [`.env.ci`](.env.ci) file contains **non-secret placeholders** that satisfy runtime env schema in CI only. Do not point it at production databases or reuse its `BETTER_AUTH_SECRET` outside disposable CI.

## HTTP security headers

[`next.config.ts`](next.config.ts) sets a baseline **Content-Security-Policy** (including `frame-ancestors 'none'`) plus standard headers. If you enable browser-visible OIDC flows or third-party script/embeds, review and extend CSP `connect-src` / `script-src` with counsel and security review.

Optional **`CRON_FAILURE_WEBHOOK_URL`**: HTTPS webhook (e.g. Slack incoming) notified when a cron route throws; see [`src/server/cron/notifyOnFailure.ts`](src/server/cron/notifyOnFailure.ts).
