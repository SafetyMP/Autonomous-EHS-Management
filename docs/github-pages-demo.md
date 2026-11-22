# Public EHS field round

[Open the dock exercise](https://safetymp.github.io/Autonomous-EHS-Management/) or [read the technical reference](https://safetymp.github.io/Autonomous-EHS-Management/#/technical).

An EHS coordinator needs to establish how pedestrian access changes between receiving and dispatch after a near miss. The site has completed the installation work order. Choose up to two stops per round, record worker or observer accounts and route the evidence to a shift supervisor or CAPA reviewer, or assign a specific stop to its area lead. The next owner’s response depends on the time and location of the observations. Compare earlier handovers and the field time used before planning another round.

OSHA’s lift-truck guidance describes the need to keep pedestrian routes clear and distinct from vehicle traffic. OSHA also recommends involving workers in follow-up inspections and evaluating whether installed controls remain effective. Its program evaluation guidance calls for tracking corrective-action timeliness. These informed the two operating windows, direct field observations and human reviewer. Field times and records are illustrative. A pilot could measure field time per action and the share of handovers returned for additional evidence. [Pedestrian traffic](https://www.osha.gov/etools/powered-industrial-trucks/workplace/pedestrian-traffic) · [Hazard prevention and control](https://www.osha.gov/safety-management/hazard-prevention) · [Program evaluation and improvement](https://www.osha.gov/safety-management/program-evaluation)

The published artifact in [demo/](../demo/) has no database, accounts or record mutations. Its in-memory notes reset on reload. Older record bookmarks land on the field round. The [technical reference](https://safetymp.github.io/Autonomous-EHS-Management/#/technical) traces authorization, transition validation and transactional recording in the full application. See the [self-hosting guide](./self-host-quickstart.md) for deployment.

## Preview locally

From the repository root:

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory demo
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). No application secrets, database setup, or npm installation are required for this static preview.

## Maintain publication and verify updates

1. In repository **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**. This is the [GitHub-documented configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow).
2. Use [`.github/workflows/pages-demo.yml`](../.github/workflows/pages-demo.yml) to publish the `demo/` artifact. Keep full-app source, environment files, and database exports out of that artifact.
3. Inspect the [workflow run](https://github.com/SafetyMP/Autonomous-EHS-Management/actions/workflows/pages-demo.yml) and its deployment URL. Confirm successful publication, then open the public URL and check field rounds, handovers, technical source links, and refresh behavior under the repository subpath.
4. Point repository homepage metadata at the Pages URL after those checks succeed.

For each update, a successful workflow alone is not evidence that all walkthrough interactions work. Full-app CI, container publication, and production promotion remain separate from Pages publication.

## Previous Vercel public demo

GitHub Pages replaces the public demonstration surface. The previous Vercel public demo is deprecated; this change does not establish that its server error was repaired. Repository deployment settings and an optional Vercel promotion path are separate from the existing remote deployment. Remote Vercel retirement has not been established, and further Vercel work is outside the current scope.
