# Cognitive-load primary CTA checklist (ADR-UX-002 / AC-004)

**Date:** 2026-07-19  
**Rule:** ≤1 filled / primary button in each stress **action region**. AI Suggest must be secondary. Destructive / reopen / override never default primary.

## Stress views

| Region ID | Surface | Primary control | Secondary / companion | Pass? |
|-----------|---------|-----------------|----------------------|-------|
| `today-queue-row` | `DashboardActionQueueHero` PrimaryCard | `.btn-primary` → item CTA | “View all tasks” text link; secondary rows are plain links | Yes |
| `field-today` | `DashboardFieldLauncher` Start here | Exactly one `.btn-primary-soft` (first permitted intake) | Remaining intake + desk link use `.btn-secondary` | Yes |
| `capture-create` | `/dashboard/incidents/new` submit row | Submit `.btn-primary` | Cancel `.btn-secondary` | Yes |
| `capture-ai` | same page AI strip | none (filled) | Suggest wording (AI) `.btn-secondary` + proposal-only copy; failure `role="alert"` | Yes |
| `decide-approve-reject` | `/dashboard/approvals` expanded row | Approve / family verb `.btn-primary` | Reject `.btn-secondary`; Cancel tertiary border | Yes |

## CAPA Decide adjacency

| Surface | Notes | Pass? |
|---------|-------|-------|
| `/dashboard/capa` create | Create CAPA = `.btn-primary`; AI Suggest = `.btn-secondary` with visible failure | Yes |
| `/dashboard/capa/[capaId]` workflow | Advance OR verify confirm mutually exclusive single `.btn-primary` | Yes |

## Forbidden patterns (fail closed)

- Two `.btn-primary` / filled emerald submit controls in the same action region
- AI Suggest as sole filled control
- Reopen / override / reject as default filled primary

## Executable proof

Cohesion suite asserts source markers + `.btn-primary` counts for Today hero, field launcher, and incident create.
