# GitHub Pages walkthrough

The live [public read-only walkthrough](https://safetymp.github.io/Autonomous-EHS-Management/) is hosted on GitHub Pages. It opens on the [conveyor 3 handoff](https://safetymp.github.io/Autonomous-EHS-Management/#/case). Compare the installation record for CAPA-021 with a hypothetical follow-up observation, then inspect the source incident or visit the [corporate overview](https://safetymp.github.io/Autonomous-EHS-Management/#/overview).

Visitors choose whether to return each packet for more evidence or forward it to the named closer, inspect the modeled consequence and replay the handoff. The source record remains ready for verification in every branch.

The standalone case includes a conceptual drawing of the transfer point, a handoff diagram that changes with the evidence packet, and a year-one cost chart. The Technical workspace link opens a compact guide to fixtures, the cost calculation and verification. Readers can expand a question or open the full corporate walkthrough from the guide. Its navigation includes a return to the conveyor case. All existing record URLs remain directly accessible.

The worksheet compares first-year costs for an email handoff, a standardized tracker and a self-hosted console. All volumes, handling times, labor rates and costs are editable illustrative assumptions. At the defaults, annual costs are $12,500, $9,600 and $11,000 respectively. A pilot would measure actual time spent tracking evidence and the share of returned packets, alongside field review of control effectiveness. OSHA’s hazard prevention and program evaluation guidance inform those questions. See the [Government Publishing Office copy of OSHA 3885, Recommended Practices for Safety and Health Programs](https://www.govinfo.gov/content/pkg/GOVPUB-L35-PURL-gpo142334/pdf/GOVPUB-L35-PURL-gpo142334.pdf).

The case assigns evidence gathering to the line operator and shift supervisor, sufficiency review to the named CAPA reviewer, and pilot evaluation to the EHS director. The fictional plant manager funds the pilot and protects participation time. These are roles in this case. OSHA describes leadership responsibility for resourcing the safety program and workers’ contribution to identifying and evaluating controls. See the Management Leadership and Worker Participation sections of OSHA 3885 above.

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
