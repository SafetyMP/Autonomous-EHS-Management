# Repository identity and discovery

Autonomous EHS is self-hosted environmental, health and safety software for corporate teams. Its core journey connects an incident to assigned corrective and preventive actions (CAPA), evidence, and human verification. Authentication, organization boundaries, role-based permissions, and workflow approvals belong to the deployable application.

The [GitHub Pages walkthrough](https://safetymp.github.io/Autonomous-EHS-Management/) is a separate static artifact with synthetic, read-only records. It does not run the application backend, sign users in, or store operational records. See the [publication guide](github-pages-demo.md) and [self-host quickstart](self-host-quickstart.md).

## Sources of truth

| Surface | Maintained purpose |
| --- | --- |
| [README](../README.md), [support](../SUPPORT.md), [docs index](README.md) | Explain the product, choose a walkthrough or installation, and find help |
| [Module maturity](module-maturity.md), [compliance](../COMPLIANCE.md), [security](../SECURITY.md) | Bound capability, regulatory, and security claims |
| [GitHub Releases](https://github.com/SafetyMP/Autonomous-EHS-Management/releases) and [container packages](https://github.com/SafetyMP/Autonomous-EHS-Management/pkgs/container/autonomous-ehs-management%2Fehs-web) | Released source and deployable images; use a specific release or commit for reproducibility |
| [AGENTS.md](../AGENTS.md), [CONTEXT.md](../CONTEXT.md), [llms.txt](../llms.txt) | Short agent entry points with progressive retrieval into authoritative code and docs |
| [CITATION.cff](../CITATION.cff) | Machine-readable project attribution; cite the specific version used |
| [About metadata script](../scripts/apply-github-about.sh) | Reproducible GitHub description, homepage, and relevant topics |
| [Demo HTML](../demo/index.html), [sitemap](../demo/sitemap.xml), [demo link index](../demo/llms.txt) | Static public text, canonical URL, social metadata, and useful source links |

Release tags are authoritative for published versions. The private application package's `package.json` version is not automatically rewritten by the release workflow. The [historical changelog](../CHANGELOG.md), dated QA evidence, and ADRs retain their original context; current entry points identify historical material rather than silently recasting it as fresh verification.

## Discovery decisions

- The README leads with purpose, concrete workflows, a labeled screenshot, setup, support, and contribution paths. This follows [GitHub's README guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes).
- GitHub topics describe the actual domain and delivery model, within the [20-topic limit](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics). Topic changes are applied separately from source commits and must be read back from GitHub.
- The public walkthrough exposes useful text and ordinary links in its initial HTML, including when JavaScript is unavailable. This follows [Google's JavaScript guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) and [crawlable link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).
- Canonical and social URLs use the actual project Pages base path. Hash-based walkthrough states are views of one document, so the sitemap lists one canonical page. Structured data describes the software source and matches visible content; it adds no invented reviews, ratings, certification, or offers.
- `llms.txt` files are optional navigation aids for agents, not a recognized guarantee of discovery, an instruction authority, or crawler access controls. [Google's AI search guidance](https://developers.google.com/search/docs/appearance/ai-features) does not require special AI files or special schema.
- A `robots.txt` beneath a project path cannot control the host root. This repository does not pretend to set host-wide crawler policy for `safetymp.github.io`.
- The Pages social image is supplied through Open Graph and Twitter metadata. GitHub's repository social-preview setting is separate and requires an [explicit settings upload](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview); committing an image does not configure it.
- [GitHub citation support](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files) reads the root `CITATION.cff`. The project attribution does not invent a DOI, individual author, or release date.

## Verification and maintenance

Run `npm run verify` for repository checks and `npx playwright test --config playwright.demo.config.ts` for interactive walkthrough, accessibility, static fallback, links, metadata, image, and sitemap contracts. For a published check, set `DEMO_BASE_URL=https://safetymp.github.io/Autonomous-EHS-Management/` when running the latter command. These checks verify behavior and technical discoverability, not search ranking, indexing, application deployment security, or regulatory compliance.

When changing a public URL or product claim, update the README, About metadata script, package metadata, agent indexes, demo HTML/social metadata, sitemap, and relevant operator docs together. Preserve application authorization and workflow enforcement. Check remote CI for the actual merged commit and inspect the public artifact before claiming publication complete.

No search-engine ownership claim, Search Console submission, custom GitHub social-preview upload, or indexing outcome is implied by these source changes. The old Vercel deployment and remote jobs are outside this publication path and have not been retired through repository metadata changes.
