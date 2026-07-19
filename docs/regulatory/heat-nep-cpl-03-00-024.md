# Heat NEP (CPL 03-00-024) — programme aid notes

**Not legal advice. Not a federal heat standard determination.**

## Timeline (federal)

| Milestone | Date |
|-----------|------|
| OSHA revised Heat NEP directive CPL 03-00-024 effective | 2026-04-10 |
| Appendix I — Evaluation of a Heat Program | Formal ~11-point inspector evaluation framework |
| Appendix J — Citation Guidance | Out of product scope (enforcement doctrine) |

Autonomous EHS provides an **Appendix I–aligned self-audit checklist** and optional heat-condition logs as a **programme-of-record** aid for inspection readiness. It does **not** determine General Duty Clause liability, issue citations, or automate Cal/OSHA §§3395/3396.

## Product posture

- Acceptable: “Heat NEP Appendix I program aid,” “inspection-readiness self-audit”
- Prohibited without additional work: “Meets OSHA heat standard,” “Cal/OSHA heat compliant out of the box,” “federal heat rule compliance engine”

See [COMPLIANCE.md](../../COMPLIANCE.md) and [regulatory-posture-boundary.md](../regulatory-posture-boundary.md).

## Catalog and UI

- Checklist keys/labels: [`src/lib/regulatory/heatNepAppendixI.ts`](../../src/lib/regulatory/heatNepAppendixI.ts)
- Version stamp `2026-04-cpl-03-00-024` = in-repo checklist revision aligned to the April 2026 NEP (not a new CPL number)
- Console: [`/dashboard/heat-program`](../../src/app/dashboard/heat-program/page.tsx)
- Router: `compliance.heatProgram.*`

## Non-goals

- Appendix J citation automation
- Cal/OSHA heat rule engine
- Final federal heat standard claims
