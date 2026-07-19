# EHS UX Corporate Final Dossier — Calm Focus Gen-1

**Program:** `ehs-ux`  
**Cycle:** Calm Focus Gen-1 (corporate R4)  
**Phase:** ADVERSARY complete → packaging for `AWAITING_USER_APPROVAL`  
**Revision:** 1  
**Generation:** 24  
**Prepared by:** corporate-ceo  
**User approval:** not granted (CEO does not approve)

**Corporate root:** `/Users/sagehart/Downloads/ehs-corporate-program`  
**Site:** `/Users/sagehart/Downloads/Autonomous EHS Management System `

**Predecessor:** Approved ehs-ux R1 task-first IA package (`_archives/ehs-ux-r1-approved`). R2 honesty non-negotiables remain in force.

---

## 1. Mission

**Calm Focus** visual + density overhaul of the Autonomous EHS console. Addresses two co-equal user complaints: (1) screens feel overwhelming / hard to learn, (2) dislike of the prior generic zinc/emerald visual feel.

Delivers progressive disclosure on Today, Fraunces + Source Sans 3 typography, safety teal/forest tokens, quieter chrome, WCAG 2.2 AA evidence, and executable density/visual digests — **without** WCAG 3 conformance claims, native mobile/store apps, Plumbing→Core promotion via polish, or agency filing readiness.

---

## 2. Domains used

| Domain | Role |
| --- | --- |
| product | Density contracts, learnability ladder, visual language, anti-oversell |
| architecture | Sole shell, progressive disclosure slots, token/font ADR-UX-005/006 |
| quality | Smoke, axe, density, visual digests, WCAG 3 claim lint |
| platform | PWA/safe-area/touch/outbox, ADR-UX-007 platform status disclosure |

Specialist inputs: `_specialist_packets/*-calm-focus.json` (DESIGN) and `_review_packets/` (CORPORATE_REVIEW).

---

## 3. Artifacts and digests (`program.json`)

| Artifact key | Path (basename) | Rev | sha256 |
| --- | --- | --- | --- |
| `acceptance` | `acceptance.json` | 1 | `0d1b6b846a94465f7e7c3f3a7952f6a631de57f08abaf9a98d8db6738a10ec21` |
| `adr:ADR-UX-005` | `ADR-UX-005-calm-focus-tokens-typography-chrome.md` | 1 | `bc29702c97e9bd35a4d4af6cf7c43a46155295dda802a217dbbb7490729d7f4f` |
| `adr:ADR-UX-006` | `ADR-UX-006-progressive-disclosure-today-home.md` | 1 | `44d77fc1fa2bba512f6c9f71f6eeec9e8b812b81b09efb61e770f858d9fff57f` |
| `adr:ADR-UX-007` | `ADR-UX-007-platform-status-disclosure-a11y-visual.md` | 1 | `893d1611d42b36c35e6e1ace9340d9a232c2ac1638dce54d69771a28ebea34f7` |
| `corporate_handoff` | `corporate-handoff.json` | 1 | `cc77cb694a0d0214b5adbfe18c1e04b72eef9a613b7283c5a5065ff45de646b4` |
| `implementation` | `adr` | 1 | `f6adb759097a5eef0b98d45600214bfdca9d924e66ba2bfc01c0c1fdbd08ab1f` |
| `master_spec` | `master-spec.md` | 1 | `1482afbbf786ac59ced3fb9e8d28afb9ff671646d7301e1963feade04b038196` |
| `runtime_manifest` | `package.json` | 1 | `b1cb7a4b9cf53c75da571845af8c51b12988041f30ab956888b74832e97f3348` |
| `verification` | `operations-calm-focus-r4.json` | 1 | `4df1cc4bbe1e58ce877cb7351d0f0b024802102f5d97059fc14c7cfbf7f8942f` |
| `verification_scripts` | `scripts` | 1 | `951f2181a949ad55629109a603faf3afc5eab360efeeaab041509aaa8ba85323` |

Integration / review / adversary target digest: `77d0f6e03452ba90345e8b558321c3ed2b5c0462999e16e601ead6cfd8ae4c8f`.

---

## 4. Gate results

All gates **PASS** at revision 1.

| Gate | Status | Rev | Reviewer | Report sha256 |
| --- | --- | --- | --- | --- |
| adversary | PASS | 1 | corporate-adversary | `cdab5bb1ce0690f026ba8384a7da810f7a41d1a836e2573b008691e49cb9a809` |
| corporate_acceptance | PASS | 1 | coo | `e9fd9529e062b11263075ae2fb5ea203dee1db6c9de71d49f722141bfbabfdf8` |
| corporate_review | PASS | 1 | corporate-specialist | `d61c0e945b21f19f58ae7f32251152bcb215102c81ae2b27087ad3d0c4bcd83b` |
| operations | PASS | 1 | operations-excellence | `d8714d8ff2222d07909d58ce48855343efe593d390780568376e6659a990e322` |
| site_verify | PASS | 1 | operations-excellence | `840090b3d10f7fa89efff6d9cb5c49c4a703b069608b6de5b20fbec52d4d96e3` |

Adversary evidence: live deny suite green (`evidence/adversarial-calm-focus-r1b.json`); review `evidence/adversary-review-calm-focus-r1.json` (blocking findings empty).

---

## 5. Site ADRs (Calm Focus)

| ADR | Title | Covers |
| --- | --- | --- |
| **ADR-UX-005** | Tokens / typography / chrome | Fraunces + Source Sans 3; teal/forest tokens; quiet chrome |
| **ADR-UX-006** | Progressive disclosure | Today density ceilings; KPI closed by default; field intake-only |
| **ADR-UX-007** | Platform status + evidence | Maturity disclosure honesty; a11y/visual digests; WCAG 3 non-claim |

Predecessor ADRs UX-001..004 remain in force for IA, sole shell, outbox status-region-first, and a11y project topology.

---

## 6. Executable quality snapshot

From site `operations-calm-focus-r4.json` and corporate_review verify:

- Smoke core-spine green; a11y axe WCAG 2.2 AA green
- Density: KPI tiles 0 on first paint; interactive controls ≤12 both desk personas
- Visual digests + brand checklist recorded
- Touch ≥44px; outbox `#field-outbox-status` preserved
- WCAG 3 claim lint green
- Mode H1s use `.mode-h1` (Fraunces); brand uses `.font-display`

---

## 7. Residuals (non-blocking)

- Minor ADR primary hex documentation drift vs shipped token
- program.json ADR digest hygiene may lag disk until next record
- Outdoor glare spot-check residual (inherited)
- Chip/feed overflow fixture depth residual (quality)

---

## 8. Explicit non-claims

- Not WCAG 3 conformant / certified
- Not a native iOS/Android / App Store field app (D-006 blocked)
- Not Plumbing→Core or agency filing readiness via polish
- Adversary run is adversarial testing, not a formal penetration test

---

## 9. User decision required

Only the user may grant `user_approval` and advance to `APPROVED`.  
Agents must not pass `--actor user` or infer approval from this dossier.
