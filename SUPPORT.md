# Support

Autonomous EHS Management is self-hosted Apache-2.0 software. The repository provides documentation and public issue tracking; it does not promise a hosted service, response-time agreement, or long-term-support release train. See [governance](GOVERNANCE.md).

## Choose the experience

- **Explore the product:** the [GitHub Pages demo](https://safetymp.github.io/Autonomous-EHS-Management/) contains synthetic, read-only examples. It has no login, database, or operational record storage.
- **Run the full application:** use the [local setup](README.md#run-the-demo) or [self-hosting guide](docs/self-host-quickstart.md). Source [releases](https://github.com/SafetyMP/Autonomous-EHS-Management/releases) and the [container package](https://github.com/SafetyMP/Autonomous-EHS-Management/pkgs/container/autonomous-ehs-management%2Fehs-web) are available on GitHub.
- **Understand a workflow:** start with the [user manual](docs/user-manual-ehs-console.md), [module maturity](docs/module-maturity.md), and [documentation index](docs/README.md).

The old Vercel public demo is deprecated. Use GitHub Pages for the public walkthrough; use the application package for an authenticated deployment.

## Report a problem or request a feature

Search [existing issues](https://github.com/SafetyMP/Autonomous-EHS-Management/issues), then choose the appropriate [issue template](https://github.com/SafetyMP/Autonomous-EHS-Management/issues/new/choose). For a bug, include:

- Whether it affects the Pages demo, a local application, or a deployed application.
- The release tag, full commit SHA, or container digest, and the affected route.
- Reproduction steps, expected and actual behavior, and relevant browser/runtime versions.
- Sanitized logs or screenshots using synthetic records.

Do not publish credentials, tokens, personal information, or operational incident records. Follow [SECURITY.md](SECURITY.md) for vulnerabilities instead of opening a public issue.

For local database startup problems, confirm Docker is running and `.env.local` uses port **5433** from the example configuration. The full application's `/api/health` endpoint reports database availability; it is a diagnostic check, not evidence that every workflow or permission works.

## Deployment and regulatory responsibilities

Operators manage their authentication configuration, PostgreSQL, backups, secrets, optional integrations, and scheduled jobs. Follow the [operator runbooks](docs/runbooks/README.md) and test upgrades against your environment. Software output does not establish regulatory compliance or agency acceptance; [COMPLIANCE.md](COMPLIANCE.md) explains the boundaries.

Contributions are welcome through [CONTRIBUTING.md](CONTRIBUTING.md). Community participation follows the [Code of Conduct](CODE_OF_CONDUCT.md).
