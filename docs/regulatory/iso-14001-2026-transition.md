# ISO 14001:2026 transition — programme aid notes

**Not legal advice. Not a certification body or IAF transition completion.**

## Timeline

| Milestone | Date |
|-----------|------|
| ISO 14001:2026 published | 2026-04-15 |
| Typical CB transition window | ~3 years (certificates to new edition by approximately 2029-04/05) |

In-app fields support **transition programme evidence** for context, aspects, and management of change. Certification audits and transition decisions remain with the customer and their certification body.

## In-app field map

| Standard theme | Product surface | Notes |
|----------------|-----------------|-------|
| Clause 4 environmental conditions (climate, biodiversity, pollution, resources, ecosystems) | Organization context — `environmental_condition_tags` | Tags on context issues |
| Aspect climate / biodiversity relevance + lifecycle perspective | Environment — aspects | Flags + lifecycle note / stage |
| Clause 6.3 planning of changes | Management of change | Change trigger, aspects/obligations/controls review flags, post-implementation review due |

## Product posture

- Acceptable: “ISO 14001:2026 transition programme aids,” “ISO 14001:2026-style EMS fields”
- Prohibited: “ISO 14001:2026 certified by this software,” “IAF transition complete”

See [COMPLIANCE.md](../../COMPLIANCE.md) and [regulatory-posture-boundary.md](../regulatory-posture-boundary.md).

## Code pointers

- Conditions catalog: [`src/lib/regulatory/iso14001EnvironmentalConditions.ts`](../../src/lib/regulatory/iso14001EnvironmentalConditions.ts)
- UI: `/dashboard/context`, `/dashboard/environment`, `/dashboard/moc`
