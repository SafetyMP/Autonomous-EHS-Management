## Unreleased

### Features

* **regulatory:** July 2026 programme-of-record pack — Heat NEP Appendix I aid (CPL 03-00-024 eff. 2026-04-10), EPCRA/HCS 2027 hazard catalog Plumbing UI, ISO 14001:2026 context/aspect/MOC transition aids; claim hygiene and docs under `docs/regulatory/`

### Bug Fixes

* **regulatory:** disambiguate EPCRA HNOC health/physical hazard class labels; wire aspect `lifecycle_stage`; MOC Clause 6.3 edit/display

## [1.4.7](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.4.6...v1.4.7) (2026-07-12)


### Bug Fixes

* **security:** resolve Scorecard quality and supply-chain alerts ([#51](https://github.com/SafetyMP/Autonomous-EHS-Management/issues/51)) ([a5346bf](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/a5346bff30000891d3ae63c729e3752a203d0f02))

## [1.4.6](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.4.5...v1.4.6) (2026-07-12)


### Bug Fixes

* **security:** remove duplicate Scorecard permissions block ([92ae96b](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/92ae96bb4e2a765fd7163ac2ec87055445bc724b))

## [1.4.5](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.4.4...v1.4.5) (2026-07-12)


### Bug Fixes

* **security:** apply dependency audit remediations ([#41](https://github.com/SafetyMP/Autonomous-EHS-Management/issues/41)) ([508736b](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/508736bb4597c79cf6e396a3ed92e839b8e18873))

## [1.4.4](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.4.3...v1.4.4) (2026-07-12)


### Bug Fixes

* **ci:** align smoke E2E selectors with current dashboard UI ([#40](https://github.com/SafetyMP/Autonomous-EHS-Management/issues/40)) ([f5a797b](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/f5a797b71b8f27dc2ea1e94342609cfdb38df2fd))

## [1.4.3](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.4.2...v1.4.3) (2026-07-12)


### Bug Fixes

* **security:** per-org inbound secrets and SSRF-safe operational webhooks ([#39](https://github.com/SafetyMP/Autonomous-EHS-Management/issues/39)) ([f02e882](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/f02e88233603c7ed4b76a051885ce66229e638e7))

## [1.4.2](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.4.1...v1.4.2) (2026-07-06)


### Bug Fixes

* **harness:** sync C17 workspace_root attribution in hook logs ([0e19d94](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/0e19d94f855af88b3ce6b1b8c3616280aa4f029b))

## [1.4.1](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.4.0...v1.4.1) (2026-05-24)


### Bug Fixes

* **build:** use pg-boss named import for Vercel typecheck ([6c6d66f](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/6c6d66fe479075ee4fc4db783ebd3fbb0613322d))

# [1.4.0](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.3.10...v1.4.0) (2026-05-13)


### Features

* **ratelimit:** RATE_LIMIT_DISABLED kill switch for prod without Upstash ([647181a](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/647181ac50fb46e5d16bca37640000d215bed989))

## [1.3.10](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.3.9...v1.3.10) (2026-05-03)


### Bug Fixes

* **auth:** align client and server base URL for Vercel previews ([19f7b2a](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/19f7b2abca6ce3f48d41b8fa59b9801b19394eaf))

## [1.3.9](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.3.8...v1.3.9) (2026-05-03)


### Bug Fixes

* **auth:** allow sign-in in production without Upstash rate limiter ([963498e](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/963498e6ea5dea3a8643fcc6a4c14a62f4f2602a))

## [1.3.8](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.3.7...v1.3.8) (2026-05-03)


### Bug Fixes

* **build:** skip env validation during Next production build phase ([98a2865](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/98a2865cf6f04235eed0e6979c0d0557b02fd660))

## [1.3.7](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.3.6...v1.3.7) (2026-05-03)


### Bug Fixes

* **cron:** defer env validation for cron routes (readValidatedEnv) ([084e7d9](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/084e7d914e7fb51b80c4e0c9fe1d4ac90ce0a567))

## [1.3.6](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.3.5...v1.3.6) (2026-05-03)


### Bug Fixes

* defer server env/auth/db for build; Vitest readValidatedEnv bootstrap ([8eb2561](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/8eb256170e3ff9d4b88eda3b650c30a6b9cf70d2))

## [1.3.5](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.3.4...v1.3.5) (2026-05-03)


### Bug Fixes

* **auth:** lazy-load Better Auth handler to unblock Vercel build ([f327b77](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/f327b779eda660468808a13ea840901600600bb0))

## [1.3.4](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.3.3...v1.3.4) (2026-05-03)


### Bug Fixes

* **build:** webpack build + load .env before workers; widen Vercel URL fallback ([6005397](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/60053975a5f10f83ea02b5a367628d2ec8fed20e))

## [1.3.3](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.3.2...v1.3.3) (2026-05-03)


### Bug Fixes

* **env:** derive app URLs from VERCEL_URL when unset ([8e0fb58](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/8e0fb58d0e6d970e8f1a37ed2bbe9c522fa5a662))

## [1.3.2](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.3.1...v1.3.2) (2026-05-03)


### Bug Fixes

* **env:** treat empty optional vars as unset for CI and Vercel builds ([468a4e5](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/468a4e551a69aef7ec79e9bb7e40a705a9cabe67))

## [1.3.1](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.3.0...v1.3.1) (2026-05-03)


### Bug Fixes

* **docker:** skip env validation during next build in image builder ([309cf3f](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/309cf3f55a433746a8c8ee90fa869180f35157f1))

# [1.3.0](https://github.com/SafetyMP/Autonomous-EHS-Management/compare/v1.2.0...v1.3.0) (2026-05-03)


### Features

* Context Sync, ops observability, and EHS console docs alignment ([cd583a2](https://github.com/SafetyMP/Autonomous-EHS-Management/commit/cd583a2c9444659dc9ab3c49f015f29467d012ee))

# Changelog

Automated releases append versioned sections here via [semantic-release](https://semantic-release.gitbook.io/). See also [GitHub Releases](https://github.com/SafetyMP/Autonomous-EHS-Management/releases) for downloadable notes.
