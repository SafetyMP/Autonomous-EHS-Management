# Permit taxonomy copy audit (ADR-UX-001 / AC-003)

**Date:** 2026-07-19  
**Binding:** Two permit families stay copy-separated; no undifferentiated “Permits” primary chrome.

## Families

| Family | Route | Nav section | Sidebar label | Must never say |
|--------|-------|-------------|---------------|----------------|
| Work permits (PTW) | `/dashboard/permits` | **Capture** (primary) | Work permits (PTW) | regulatory / EPA / agency permit |
| Environmental / regulatory env | `/dashboard/environmental-permits` | **Plan & programme** (secondary) | Regulatory env permits | PTW / hot work / confined space intake |

## Checklist (fail closed)

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1 | Primary chrome has no section titled only **Permits** mixing both families | PASS — PTW in Capture; env in Plan & programme | PASS (nav source) |
| 2 | Sidebar labels qualify family | “Work permits (PTW)” vs “Regulatory env permits” | PASS |
| 3 | User manual distinguishes families | Manual updated under Capture vs Plan & programme | PASS (manual edit) |
| 4 | Approvals Decide path uses family-specific verbs/permissions | `work_permit:approve` vs `environmental_permit:approve` (existing product) | PASS (pre-existing; not regress by IA) |
| 5 | Empty states / marketing do not say bare “permits” for both | Manual glossary + PTW section wording retained | PASS |
| 6 | Env permits not agency filing language | Programme-of-record only | PASS (claim-lint + maturity) |

## Nav dump (post-ADR)

```
Capture:
  - /dashboard/permits → Work permits (PTW)
Plan & programme:
  - /dashboard/environmental-permits → Regulatory env permits
```

## Residual risk

Page-level empty-state strings on permit modules were not rewritten in this packet (out of write-set beyond nav/manual). Spot-check those surfaces in a follow-on packet if copy drift appears.
