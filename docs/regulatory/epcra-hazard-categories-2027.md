# EPCRA hazard categories (2027 reporting) — programme notes

**Not legal advice. Not an EPA filing system.**

## Timeline (federal)

| Milestone | Date |
|-----------|------|
| EPA final rule conforming EPCRA 311/312 to OSHA HCS 2024 | 2026-06-22 (91 FR 37022) |
| Rule effective | 2026-08-21 |
| New hazard categories required for EPCRA 311 list submissions | By 2028-01-01 |
| First Tier II reports using new categories (RY2027) | Due 2028-03-01 |

Autonomous EHS stores SDS Section 2–style **hazard class + category** rows for programme inventory (`chemical_hazard_classification`). Customers remain responsible for Tier2 Submit, SERC/LEPC submissions, and counsel review.

## Product posture

- Acceptable: “HCS 2024–aligned hazard classes for programme inventory”
- Prohibited without additional work: “Tier2 Submit,” “EPA e-filing,” “EPA Tier II system of record”

See [COMPLIANCE.md](../../COMPLIANCE.md) and [regulatory-posture-boundary.md](../regulatory-posture-boundary.md).

## Catalog

Curated allowlist: [`src/lib/regulatory/epcraHazardCategories2027.ts`](../../src/lib/regulatory/epcraHazardCategories2027.ts).

EPA publishes a crosswalk XLSX (“2027 EPCRA Hazard Categories and OSHA Hazard Categories Crosswalk”) on the [EPA EPCRA hazard categories page](https://www.epa.gov/epcra/epcra-hazardous-chemical-inventory-reporting-revisions-hazard-categories-and-reporting). Update the in-repo catalog when EPA revises the list; do not scrape at runtime.
