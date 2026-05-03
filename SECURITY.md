# Security policy

## Supported versions

| Area        | Supported |
|------------|-----------|
| Latest `main` | Yes       |
| Prior release tags | Org policy |

## Reporting a vulnerability

**Do not** open a public GitHub issue for active security findings.

Use one of:

- **GitHub [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)** for this repository (enable in **Settings → Security** if not already).
- Your **contractual / security channel** with SafetyMP (do not disclose active exploits on a public issue).

Include: affected routes or components, reproduction steps, impact, and suggested fix if any.

We aim to acknowledge within **7 business days**; timelines for fix and disclosure depend on severity and coordinated disclosure with your security team.

## Scope (application)

Out of scope unless agreed in writing: third-party SaaS-only issues, generic dependency advisories already tracked by Dependabot (see PRs / `npm audit` policy in CI), social engineering.

## Credentials

Never commit secrets. Use `.env*` examples only; rotate any credential that was ever pasted into an issue or PR.
