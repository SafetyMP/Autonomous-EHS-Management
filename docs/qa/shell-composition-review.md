# Shell composition review (ADR-UX-002 / AC-012)

**Date:** 2026-07-19  
**Reviewer role:** site-specialist (PKT-UX-002)

## Binding composition

| Step | File | Renders |
|------|------|---------|
| 1 | `src/app/dashboard/layout.tsx` | `DashboardChrome` only |
| 2 | `src/components/dashboard-chrome.tsx` | PWA hint strip + `DashboardShell` |
| 3 | `src/components/dashboard-shell.tsx` | session/org gate → `DashboardAuthenticatedLayout` |
| 4 | `src/components/dashboard-authenticated-layout.tsx` | `DashboardSiteHeader` + `DashboardGroupedNav` + `#main-content` |

## Parallel-tree check

| Check | Result |
|-------|--------|
| Only one `layout.tsx` under `src/app/dashboard/` | Pass |
| No alternate authenticated shell entry for `/dashboard` | Pass |
| Nav href authority = `dashboard-nav-links.ts` | Pass (unchanged by this packet) |
| Outbox status region remains inside Shell (Today/Capture visible) | Pass (`FieldOutboxStatusBar` in Shell) |

## Marker attributes (implementation aid)

- `data-dashboard-shell="chrome"` on Chrome root
- `data-dashboard-shell="authenticated"` on AuthenticatedLayout root
- `data-dashboard-shell="workspace"` on Shell workspace column

## Executable proof

`npx vitest run tests/unit/dashboard/cohesion.test.ts` — suite `shell composition + tokens + honesty (ADR-UX-002)`.
