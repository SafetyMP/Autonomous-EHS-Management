# Conveyor-guard closure case

[Open the North plant case](https://safetymp.github.io/Autonomous-EHS-Management/) or [trace a selected evening handoff](https://safetymp.github.io/Autonomous-EHS-Management/#/technical?handoff=advanced&trial=evening&phase=record).

INC-1042 links a near miss on conveyor 3 to CAPA-021. Maya Chen records the installation. Two operators describe the guard at 08:10 and 20:40. The shift coordinator chooses which packet to return or send to Alex Morgan. The three cutoffs and two routing decisions have six distinct consequences. The conveyor drawing, handoff diagram and cost comparison use synthetic evidence. Only a human reviewer can verify the real action.

The EHS director compares email, a standardized tracker and a self-hosted console. At 600 annual reviews and $50 per hour, the illustrative first-year costs are $12,500, $9,600 and $11,000. Change the volume, time and costs to see when the order changes. The plant manager decides whether to fund a pilot that preserves worker observations and reduces handling costs. The case draws on the worker participation, control effectiveness and program evaluation sections of [OSHA 3885](https://www.govinfo.gov/content/pkg/GOVPUB-L35-PURL-gpo142334/pdf/GOVPUB-L35-PURL-gpo142334.pdf).

The technical workspace carries the selected packet, handoff and worksheet assumptions. Inspect three trial stops for each fixture. The installation-only trial exercises the short-notes rejection. Conflicting shift reports produce a human hold. A hypothetical repeat visit demonstrates an eligible transition with explicit reviewer acceptance. Change that same reviewer’s note to the abbreviated entry to see the length gate reject it and the modeled count of new transition entries fall from one to zero. The trace links to the actual router and transition tests. Its permalink restores the trial and stop, and a return link reopens the selected business case. The older dock and console bookmarks resolve to the current case or its trace.

The public artifact in [demo/](../demo/) uses static HTML, CSS and JavaScript. The case selection is encoded in the URL. Only example controls are accepted. This exercise makes no API calls or record mutations. See the [self-hosting guide](./self-host-quickstart.md) for the full application.

## Preview locally

From the repository root:

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory demo
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). No application secrets, database setup, or npm installation are required for this static preview.

## Maintain publication and verify updates

1. In repository **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**. This is the [GitHub-documented configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow).
2. Use [`.github/workflows/pages-demo.yml`](../.github/workflows/pages-demo.yml) to publish the `demo/` artifact. Keep full-app source, environment files, and database exports out of that artifact.
3. Inspect the [workflow run](https://github.com/SafetyMP/Autonomous-EHS-Management/actions/workflows/pages-demo.yml) and its deployment URL. Confirm successful publication, then open the public URL and check conveyor handoffs, worksheet values, selected trials, source links and refresh behavior under the repository subpath.
4. Point repository homepage metadata at the Pages URL after those checks succeed.

For each update, a successful workflow alone is not evidence that all walkthrough interactions work. Full-app CI, container publication, and production promotion remain separate from Pages publication.

## Previous Vercel public demo

GitHub Pages replaces the public demonstration surface. The previous Vercel public demo is deprecated; this change does not establish that its server error was repaired. Repository deployment settings and an optional Vercel promotion path are separate from the existing remote deployment. Remote Vercel retirement has not been established, and further Vercel work is outside the current scope.
