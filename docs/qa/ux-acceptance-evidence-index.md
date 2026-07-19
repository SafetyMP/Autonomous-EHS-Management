# UX acceptance evidence index (AC-001..AC-021 + AC-022/023)

ADR-UX-004 / AC-022 — single index mapping acceptance IDs to artifacts.  
Honesty: no WCAG 3 conformance claims (AC-008). Barriers D-006 / D-010 remain blocked (AC-023).

| ID | Statement (short) | Primary evidence | Packet / ADR |
|----|-------------------|------------------|--------------|
| AC-001 | Task-first Today / Capture / Decide / Prove IA | [ia-task-mode-map.md](./ia-task-mode-map.md), [nav-coverage-matrix.md](./nav-coverage-matrix.md) | ADR-UX-001 |
| AC-002 | Field vs desk home from server layout preference | `organization.dashboardHomeLayout`, dashboard home | ADR-UX-001 / 002 |
| AC-003 | Persona journeys map to modes | [ux-persona-journey-map.md](./ux-persona-journey-map.md) | ADR-UX-001 |
| AC-004 | ≤1 filled primary per stress action region | cohesion tests; field launcher / CAPA CTAs | ADR-UX-002 |
| AC-005 | R2 honesty — no oversell in chrome | claim-lint; barrier playbook | ADR-UX-002 |
| AC-006 | Maturity banners honest | module maturity banners + docs | ADR-UX-002 |
| AC-007 | Automated a11y project with axe WCAG 2.2 AA | `--project=a11y`, [a11y-test-plan.md](./a11y-test-plan.md) | **ADR-UX-004** |
| AC-008 | No WCAG 3 conformance verbs | ADR-UX-004 decision §4; claim language review | **ADR-UX-004** |
| AC-009 | No native-store / filing-ready claims | claim-lint; PWA installable-web copy | ADR-UX-002 / 003 |
| AC-010 | Core spine hrefs stable | `CORE_SPINE` nav links; cohesion tests | ADR-UX-001 |
| AC-011 | Nav coverage matrix complete | [nav-coverage-matrix.md](./nav-coverage-matrix.md) | ADR-UX-001 |
| AC-012 | Sole shell composition | [shell-composition-review.md](./shell-composition-review.md) | ADR-UX-002 |
| AC-013 | Token layer without mandatory UI kit | `globals.css` tokens; cohesion tests | ADR-UX-002 |
| AC-014 | Field Administration hide server-backed | `filterDashboardNavSections` + permissions | ADR-UX-002 |
| AC-015 | Status-region-first outbox | FieldOutboxStatusBar; outbox UAT | ADR-UX-003 |
| AC-016 | Retry / conflict abandon UX | [outbox-retry-conflict-uat.md](./outbox-retry-conflict-uat.md) | ADR-UX-003 |
| AC-017 | PWA safe-area + ≥44px targets | [pwa-safe-area-touch-targets.md](./pwa-safe-area-touch-targets.md) | ADR-UX-003 |
| AC-018 | Device-loss / ops checklist honesty | `docs/offline-field-outbox.md` | ADR-UX-003 |
| AC-019 | Keyboard E2E field → incident | `tests/e2e/a11y/keyboard-field-to-incident.a11y.spec.ts` | **ADR-UX-004** |
| AC-020 | Serious/critical axe = fail on Gen-1 routes | `expectNoSeriousCriticalAxeViolations` | **ADR-UX-004** |
| AC-021 | Glare contrast checklist | [glare-contrast-checklist.md](./glare-contrast-checklist.md) | **ADR-UX-004** |
| AC-022 | This evidence index exists | this file | **ADR-UX-004** |
| AC-023 | Unresolved decisions logged | D-006 / D-010 blocked; UD-Q-UX-001 closed by ADR-UX-004 | ADR-UX-001..004 |

## Run digests

| Packet | Digest |
|--------|--------|
| PKT-UX-001 | `.corp-harness/evidence/adr-ux-001-verify.txt` |
| PKT-UX-002 | `.corp-harness/evidence/adr-ux-002-verify.txt` |
| PKT-UX-003 | `.corp-harness/evidence/adr-ux-003-verify.txt` |
| PKT-UX-004 | `.corp-harness/evidence/adr-ux-004-a11y-run.txt` |
| Return-work migrate/seed | `.corp-harness/evidence/return-db-migrate.txt` / `return-db-seed-ci.txt` |
| Return-work `@smoke` / AC-010 | `.corp-harness/evidence/return-integration-e2e.txt` sha256 `b4a604ac2aa4204c6452f10717efe161207d98369b7333cf431304c8acce8dea` — **30 passed / 1 skipped** |
| Return-work outbox/touch AC-015–017 | `.corp-harness/evidence/return-outbox-touch.txt` sha256 `941da3e53b3c739b5e04111c779080f085512c94637df5c7666c826038a60ae9` |
| Return-work a11y AC-007/019 | `.corp-harness/evidence/return-a11y.txt` sha256 `c6b8592feb9c0b3ebbe8f5c4690aceb18936f48f12075c26d0a010f731da00c4` — **9 passed** |
| Return-work AC-020 empty-submit ARIA | `.corp-harness/evidence/return-a11y-empty-submit.txt` — **1 passed** (`incident-create-empty-submit.a11y.spec.ts`) |
| Return-work AC-015 flag=0 absence | `.corp-harness/evidence/return-outbox-flag0.txt` — **1 passed** |
| Return-work `./scripts/verify.sh` | `.corp-harness/evidence/return-verify.txt` sha256 `adb023862c7fab1d66311ca972dd7daf0a2c35ba7c4ddab3d6186903892d93ef` — exit 0 |
| Return-work index | `.corp-harness/evidence/return-work-ux-r1.json` |
