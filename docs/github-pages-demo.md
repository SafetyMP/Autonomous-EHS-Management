# GitHub Pages walkthrough

The live [public read-only walkthrough](https://safetymp.github.io/Autonomous-EHS-Management/) is hosted on GitHub Pages. It presents corporate EHS navigation, an overview, and the incident-to-corrective-action journey using synthetic examples.

The walkthrough is a separate static artifact in [`demo/`](../demo/). It has no authentication service, PostgreSQL database, operational API, or connection to customer records. Navigation, filters, and source/evidence links explore fixed synthetic records; there are no record writes, approvals, uploads, or submissions. It does not verify server permissions, demonstrate a production deployment, or establish compliance.

The **full application remains deployable** from this repository and its Docker/GHCR package. It retains authentication, PostgreSQL, permission-gated mutations, audit logging, and human verification. See the [self-host quickstart](./self-host-quickstart.md) or the [local full-app demo](../README.md#run-the-demo).

## Preview locally

From the repository root:

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory demo
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). No application secrets, database setup, or npm installation are required for this static preview.

## Maintain publication and verify updates

1. In repository **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**. This is the [GitHub-documented configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow).
2. Use [`.github/workflows/pages-demo.yml`](../.github/workflows/pages-demo.yml) to publish the `demo/` artifact. Keep full-app source, environment files, and database exports out of that artifact.
3. Inspect the [workflow run](https://github.com/SafetyMP/Autonomous-EHS-Management/actions/workflows/pages-demo.yml) and its deployment URL. Confirm successful publication, then open the public URL and check navigation, incident-to-action links, and refresh behavior under the repository subpath.
4. Point repository homepage metadata at the Pages URL after those checks succeed.

For each update, a successful workflow alone is not evidence that all walkthrough interactions work. Full-app CI, container publication, and production promotion remain separate from Pages publication.

## Previous Vercel public demo

GitHub Pages replaces the public demonstration surface. The previous Vercel public demo is deprecated; this change does not establish that its server error was repaired. Repository deployment settings and an optional Vercel promotion path are separate from the existing remote deployment. Remote Vercel retirement has not been established, and further Vercel work is outside the current scope.
