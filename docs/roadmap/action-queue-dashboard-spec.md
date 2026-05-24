# Action queue & next-action dashboard — design spec

**Status:** Phase A/B shipped; Phase C (role-aware layout) in progress.  
**Addresses:** CTO feedback on information density and “visual dashboard highlighting next action.”  
**Related:** [workflow-depth.md](../workflow-depth.md) §5, [commandCenterSignals.ts](../../src/lib/dashboard/commandCenterSignals.ts), [staging-uat-desk-to-field.md](../qa/staging-uat-desk-to-field.md).

---

## 1. Problem statement

The desk command center ([`command-center-desk-view.tsx`](../../src/components/dashboard/command-center-desk-view.tsx)) optimizes for **supervisor/program visibility**: up to 11 “Needs attention” chips, 15 KPI tiles, activity feed, and quick actions. Personal work is split across:

- [`/dashboard/tasks`](../../src/app/dashboard/tasks/page.tsx) — four static buckets via `tasks.myOpenItems`
- [`/dashboard/approvals`](../../src/app/dashboard/approvals/page.tsx) — `approval.listMyPendingSteps`

There is **no cross-domain priority ranking**, **no record-level “do this next” hero**, and **no nav badges** on Tasks or Approvals ([`dashboard-nav-links.ts`](../../src/lib/dashboard-nav-links.ts)). Field home ([`dashboard-field-launcher.tsx`](../../src/components/dashboard/dashboard-field-launcher.tsx)) shows intake buttons only.

---

## 2. Goals and non-goals

### Goals

1. Surface **one primary next action** and up to **four secondary items** on desk home without removing program KPIs.
2. Provide a **unified, typed API** (`tasks.actionQueue`) for home hero, field strip, nav badges, and future digests.
3. **Deep-link** each item to the exact record with a clear CTA label.
4. Respect **RBAC** — org-wide items (obligations, management reviews) only when the user has read permission.
5. Meet **field accessibility** expectations: large touch targets, plain language, low cognitive load ([ui-ux-field-accessibility skill](../../.cursor/skills/ui-ux-field-accessibility/SKILL.md)).

### Non-goals

- Auto-close or auto-advance workflows to reduce UI clutter (compliance boundary).
- Replace command center KPIs for supervisors/auditors — **re-tier hierarchy**, do not delete depth.
- Email/Teams adapters in v1 of this spec (optional Phase B follow-on via [operational-webhooks.md](../operational-webhooks.md)).

---

## 3. Phased delivery

| Phase | Scope | Primary files |
|-------|--------|---------------|
| **A — Quick wins** | Hero panel from existing procedures; nav badges; field “Pending for you” strip | `command-center-desk-view.tsx`, `dashboard-field-launcher.tsx`, `dashboard-chrome.tsx`, `dashboard-nav-links.ts` |
| **B — Unified API** | `tasks.actionQueue` tRPC; shared ranking service; hero consumes API | `src/server/trpc/routers/tasks.ts`, new `src/server/services/tasks/actionQueueQuery.ts` |
| **C — Role-aware layout** | Extend `organization.dashboardHomeLayout` heuristic | `organization.ts` router, dashboard page |

This spec defines **Phase B contract** and **Phase A/C UX** so Phase A can ship as a thin client over existing queries before the unified API lands.

---

## 4. UX specification

### 4.1 Desk home — “Your work” hero (Phase A/B)

**Placement:** Immediately below page header / org switcher, **above** “Needs attention” chips and KPI grid.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Your next action                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [PRIMARY] Approve CAPA plan — "Correct guardrail..."    │ │
│ │ Due yesterday · CAPA approval                           │ │
│ │                                    [ Review & decide → ]│ │
│ └─────────────────────────────────────────────────────────┘ │
│ 3 more items · View all tasks →                             │
│   • Complete CAPA — "Install guard..." (due in 2 days)    │
│   • Training renewal — Forklift cert (expires in 5 days)  │
│   • Approve work permit — Hot work #1042                  │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**

- **Empty state:** “You’re caught up on assigned work.” Link to Task hub for org-wide reviews if user has permission.
- **Primary card:** Highest-priority item (see §5); amber border if overdue or SLA-breached.
- **Secondary list:** Next 3 items, compact rows; entire row is clickable.
- **“View all”:** Links to `/dashboard/tasks` with optional `?focus=mine` query later.

**Attention chips:** Remain for **program-level** alerts (e.g. “5 overdue inspection” org-wide). Do not duplicate items already shown in hero when they are **user-assigned** (e.g. user’s approval step appears in hero, not again as chip).

### 4.2 Sidebar nav badges (Phase A)

| Nav item | Badge source |
|----------|--------------|
| Tasks & reviews | Count of user-scoped open items (CAPAs owned + training expiring ≤30d + user’s pending approvals if folded into workbench) |
| Approvals | `approvalsInbox.myPendingStepsCount` from command center KPIs or dedicated lightweight query |

Implementation note: extend [`DashboardChrome`](../../src/components/dashboard-chrome.tsx) to accept optional badge counts from layout-level tRPC prefetch on dashboard routes.

### 4.3 Field layout — “Pending for you” strip (Phase A)

On field home, below intake buttons:

- Max **3 items**: pending approval steps + owned CAPAs with due date ≤7 days or overdue.
- Single primary CTA button per row; hide strip when empty.

### 4.4 Role-aware home (Phase C)

Extend [`organization.dashboardHomeLayout`](../../src/server/trpc/routers/organization.ts) heuristic:

| Layout | Hero prominence | KPI grid |
|--------|-----------------|----------|
| **field** | Full-width pending strip | Hidden or collapsed |
| **desk — contributor** | Hero first | KPIs below fold |
| **desk — supervisor** | Hero + program chips | Full KPI grid unchanged |

Heuristic inputs: permission keys (e.g. `analytics:read`, approval permissions), optional future org preference column.

---

## 5. Priority ranking rules (v1)

Items are scored; lower score = higher priority. Tie-break: earlier `dueAt`, then `createdAt`.

| Rank band | Source | Type key | Condition |
|-----------|--------|----------|-----------|
| 10 | `approval.listMyPendingSteps` | `approval_step` | Step `pending`, request `open`; use step/request `createdAt` as proxy if no due date |
| 20 | Owned CAPA | `capa` | Status in `pending_approval`, `planned`, `in_progress`; **overdue** (`dueDate < now`) |
| 30 | Owned CAPA | `capa` | Same statuses; due within 7 days |
| 40 | Training | `training` | `expiresOn` within 30 days, user-scoped |
| 50 | Inspection assignment | `inspection` | **Future** — assigned inspector, scheduled date passed (requires schema/query addition) |
| 60 | Compliance obligation review | `obligation_review` | Only if `compliance:read` (or existing obligation permission); org-wide overdue |
| 70 | Management review | `management_review` | Only if `management_review:read`; org-wide overdue |

**SLA breach boost:** If `programAutomation` or approval escalation records exist for the entity, subtract 5 from score (never below 10).

**Config (future):** Org-level JSON in `organization` settings to disable bands or adjust horizons — out of v1 scope.

---

## 6. API specification — `tasks.actionQueue`

### Procedure

```typescript
// src/server/trpc/routers/tasks.ts
actionQueue: protectedProcedure
  .input(
    orgScope.extend({
      limit: z.number().int().min(1).max(20).default(5),
      includeOrgWide: z.boolean().default(true),
    }),
  )
  .query(/* ... */);
```

**Permission:** `PERMISSIONS.TASKS_READ` (same as `myOpenItems`).

### Response shape

```typescript
type ActionQueueItem = {
  id: string; // stable composite: `${type}:${recordId}` or step id
  type:
    | "approval_step"
    | "capa"
    | "training"
    | "obligation_review"
    | "management_review"
    | "inspection"; // future
  recordId: string;
  title: string;
  reason: string; // plain language, e.g. "Approval overdue"
  dueAt: string | null; // ISO 8601
  priorityScore: number; // lower = more urgent; for debugging/sorting only
  isOverdue: boolean;
  href: string; // app-relative, validated pattern
  ctaLabel: string; // e.g. "Review & decide", "Open CAPA"
};

type ActionQueueResult = {
  primary: ActionQueueItem | null;
  items: ActionQueueItem[]; // includes primary as items[0] when present
  totalCount: number; // may exceed limit
  generatedAt: string;
};
```

### Implementation sketch

New service module [`src/server/services/tasks/actionQueueQuery.ts`](../../src/server/services/tasks/actionQueueQuery.ts):

1. Parallel fetch: approval steps (reuse approval query helpers), owned CAPAs, training horizon, conditional org-wide obligations/reviews.
2. Map each row to `ActionQueueItem` with shared `buildHref(type, recordId)` using existing route conventions:
   - `approval_step` → `/dashboard/approvals` (or entity detail when entity type known)
   - `capa` → `/dashboard/capa?id=` or detail route if exists
   - `training` → `/dashboard/training`
3. Sort by `priorityScore`, then `dueAt`, slice to `limit`.
4. Set `primary = items[0] ?? null`.

**Performance:** Target <200ms p95 on CI seed DB; use indexed columns (`dueDate`, `expiresOn`, `nextReviewDue`, approval step status). Consider caching count-only endpoint for nav badges (`tasks.actionQueueCounts`).

### Backward compatibility

Keep `tasks.myOpenItems` unchanged; Task hub continues to use four-bucket layout until a later UX refresh optionally consumes `actionQueue` grouped by type.

---

## 7. Component plan

| Component | Responsibility |
|-----------|----------------|
| `DashboardActionQueueHero` | Primary + secondary list; loading skeleton |
| `DashboardActionQueueFieldStrip` | Compact field variant |
| `useActionQueue` hook | tRPC `tasks.actionQueue` with org id from session |

Wire into:

- [`command-center-desk-view.tsx`](../../src/components/dashboard/command-center-desk-view.tsx) — hero above attention chips
- [`dashboard-field-launcher.tsx`](../../src/components/dashboard/dashboard-field-launcher.tsx) — strip
- [`dashboard/page.tsx`](../../src/app/dashboard/page.tsx) — prefetch `actionQueue` alongside `commandCenter`

---

## 8. Accessibility & copy

- Hero uses `<section aria-labelledby="your-work-heading">`.
- Primary CTA is a `<Link>` styled as button; secondary rows are `<ul>` of links.
- Overdue items: visible text “Overdue” plus `aria-describedby` — do not rely on color alone.
- Plain-language `reason` strings for field users (align with [ehs-technical-writer skill](../../.cursor/skills/ehs-technical-writer-enablement/SKILL.md)).

---

## 9. Testing plan

| Layer | Coverage |
|-------|----------|
| **Unit** | Priority scoring function with fixture rows |
| **Integration** | Vitest tRPC caller: user with pending approval + overdue CAPA → primary is approval |
| **RBAC** | User without obligation permission → no obligation items |
| **E2E smoke** | Optional `@smoke` signed-in: hero visible when seed assigns pending approval |
| **UAT** | Add rows to [staging-uat-desk-to-field.md](../qa/staging-uat-desk-to-field.md) § Command center |

---

## 10. Documentation updates (on implement)

- [user-manual-ehs-console.md](../user-manual-ehs-console.md) — “Your work” chapter ahead of KPI tour
- [workflow-depth.md](../workflow-depth.md) §5 — link to this spec as implemented
- Procurement screenshots when hero ships ([procurement-readiness.md](../procurement-readiness.md) §10)

---

## 11. Open questions

1. Should permit approval steps appear as separate `approval_step` items or merge with CAPA priority band?
2. Include observation follow-ups assigned to user when assignment model exists?
3. Nav badge: single aggregate vs separate Tasks vs Approvals counts?

**Recommendation:** Separate Approvals badge (exact inbox count); Tasks badge = non-approval work items only to avoid double-counting.
