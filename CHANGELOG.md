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
