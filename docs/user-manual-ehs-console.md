# EHS Console — User manual

Welcome to **EHS Console**. This guide helps safety managers and field workers record health, safety, and environment activity in plain steps.

---

## Table of contents

1. [How to read this guide](#how-to-read-this-guide)
2. [Glossary (words we use)](#glossary-words-we-use)
3. [Before you begin](#before-you-begin)
4. [Signing in and out](#signing-in-and-out)
5. [Your organization (workspace)](#your-organization-workspace)
6. [Moving around the app](#moving-around-the-app)
7. [Overview](#overview)
8. [Metrics (Safety metrics)](#metrics-safety-metrics)
9. [Incidents](#incidents)
10. [Corrective actions (CAPA)](#corrective-actions-capa)
11. [Environment](#environment)
12. [Controlled documents](#controlled-documents)
13. [Management review](#management-review)
14. [Planning](#planning)
15. [Training records](#training-records)
16. [Internal audits](#internal-audits)
17. [Organization context](#organization-context)
18. [Tasks](#tasks)
19. [Program register](#program-register)
20. [Import CSV](#import-csv)
21. [Appendix A: Micro‑copy pack (tooltips and toasts)](#appendix-a-micro-copy-pack-tooltips-and-toasts)
22. [Appendix B: For IT administrators (setup notes)](#appendix-b-for-it-administrators-setup-notes)

---

## How to read this guide

- **Who this is for:** People who manage safety programs and workers who enter real-world events—not software experts.
- **What you will find here:** Plain definitions, numbered steps (**SOP**), and a **What if things go wrong?** block for each main area.

---

## Glossary (words we use)

| Term | Simple meaning |
|------|----------------|
| **EHS** | Environment, Health, and Safety—the umbrella for keeping people safe and reducing harm to air, water, land, and neighbors. |
| **ISO** | A worldwide set of management standards companies can follow so safety and environmental work is repeatable and reviewable (not chaotic). ISO 45001 focuses on workplace safety. ISO 14001 focuses on environmental management. |
| **Incident** | Any unwanted event worth recording: a near miss, an injury concern, unsafe condition, spill, alarm, vehicle issue, etc. |
| **Severity** | How serious the incident could or did become (**low**, **medium**, **high**, **critical**—see the Incident form choices). |
| **CAPA** | Corrective And Preventive Action—a tracked plan to fix a problem so it stays fixed. CAPA rhymes with “map uh.” |
| **Environmental aspect** | A workplace activity or condition that interacts with the environment (for example wastewater, trucks, solvents, scrap). |
| **Significance** | Rough strength of environmental impact (**low**, **medium**, **high**) for prioritizing controls. |
| **Compliance obligation** | A duty you monitor—permit, law, regulation, contract item, inspection cycle, etc. |
| **Controlled document** | A formal sheet or procedure that teams must follow, with revision control (draft versus approved versus retired). |
| **Management review** | A periodic leadership checkpoint on the program: decisions, summaries, dates, next review. |
| **Hazard** | A source or situation with potential to harm people (slips, forklifts, noise, chemicals, etc.). |
| **Risk assessment** | Recording the situation and assigning a leftover risk rating after typical controls (**low**, **medium**, **high**, **very high**). |
| **Objective** | A measurable target—for worker safety (**OH&S**, occupational health and safety) or the environment (**Environmental**). |
| **Operational control** | A working rule or method that keeps risk or environmental harm in bounds (often linked to a hazard or environmental aspect). |
| **Internal audit** | Your company checks its own processes against expectations (planned, underway, completed). |
| **Finding** | Something the audit discovers—observations, gaps, strengths, chances to improve. |
| **NC (nonconformance)** | An audit finding that something does not meet a requirement (minor or major). The Metrics screen abbreviates “open audit NCs” for corrective follow-up tied to audits. |
| **RAG / knowledge search** | A search over document text your organization has uploaded and indexed—you see short excerpts and stable references (“citations”) for audit traceability—not live legal advice. |
| **Knowledge base citations** | Search results that quote stored document chunks with identifiers you can cite in records. |
| **AI-assisted draft** | A computer-suggested starter for one environmental aspect. A person must review and explicitly apply—it does not silently save without you. |
| **MOC** | Management Of Change—for changes to equipment, materials, staffing, layouts, contractors, processes. |
| **Certification body (CB)** | An outside auditing organization that evaluates your management system toward certificate decisions. |
| **CSV** | A simple comma-separated spreadsheet text format—for bulk uploads of certain lists. |

**For auditors:** The app mentions “Clause 4” in headings; that aligns with defining context, scope, and interested parties in ISO wording. Your reviewer can expand this glossary as needed.

---

## Before you begin

**What you need**

- Email and password your organization manages (or invites you with).
- A current web browser (Chrome, Safari, Firefox, Edge are typical).
- A rough idea who to call if login fails (“IT” or “EHS coordinator” varies by site).

**What EHS Console is not**

- It is **not** a lawyer or regulator. Obligations stay your responsibility—the tool helps you organize records.
- It does **not** replace eyewitness facts. Enter what you know; mark unknowns plainly.

---

## Signing in and out

### What this does

Lets you prove who you are. After sign‑in you land inside the dashboard world.

### SOP — Sign in

1. Go to `/sign-in` (or tap **Sign in** from the home page).
2. Enter **Email** and **Password**.
3. Tap **Sign in** (or Submit).
4. You should move to **Overview** (or the dashboard start your site uses).

### SOP — Create account

1. Open `/sign-up` (or tap **Create account** on the marketing home page).
2. Enter **Full name**, **Email**, and **Password** (minimum 8 characters unless your administrator changed rules).
3. Tap **Create account**.
4. If your administrator allows open signup, you may proceed. Many companies **invite** accounts instead—in that case, contact your coordinator if signup is rejected.

### SOP — Sign out

1. Open any dashboard screen.
2. Tap **Sign out** in the banner that shows **Signed in as …**.

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| “Unable to sign in” remains on screen | Confirm caps lock off. Reset password via your administrator if your company enables it. Confirm you use the organization email—not a personal alias your admin did not add. |
| Page says **Session expired. Please sign in again.** | Your secure session timed out—sign back in normally. Finish half-finished drafts on paper briefly; re-enter critical items once signed in again. |
| Spinner never stops on “Signing in…” | Weak signal—retry. Different browser sometimes helps. Inform IT if repeatable. |
| New account spins then errors | Appendix B may apply for sandboxes—or your coordinator must link membership. |

---

## Your organization (workspace)

### What this does

Shows data for **one workplace group at a time** (often a company entity or division). Metrics, lists, imports, CAPAs—everything keys to the workspace you chose.

### SOP — Pick an organization

1. Look top-right near **Overview** for the **Organization** drop-down (**only appears if you belong to more than one**).
2. Choose the correct site name.
3. Wait for counts and lists to refresh.

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| You see **Select an organization** with empty choice | Wrong account or no memberships—talk to your EHS coordinator or administrator. *(If you see confusing technical wording on screen, Appendix B describes what admins run.)* |
| Numbers look wrong after switch | Confirm you switched to the intended site—not a sibling division. Reload once. |

---

## Moving around the app

Desktop shows a horizontal **menu** (**EHS Console** brand). Phones show **Menu** to expand sections.

Links you will see repeatedly:

| Menu label | Goes to |
|------------|---------|
| Overview | Snapshot and quick actions |
| Metrics | Safety metrics charts, glossary, CSV export (`/dashboard/analytics`) |
| Incidents | List and workflows |
| CAPA | Corrective actions |
| Environment | Aspects and obligations |
| Documents | Controlled document register |
| Mgmt review | Management review entries |
| Planning | Hazards, risk, objectives, controls |
| Training | Competence entries |
| Audits | Internal audit program |
| Context | Scope, parties, internal/external topics |
| Tasks | Personalized open items hub |
| Program | Contractors, drills, certificates, KPIs, etc. |
| Import | Bulk CSV uploads |

**Home** in the corner returns toward the marketing home page—not always needed during daily tasks.

---

## Overview

Subtitle in app: **ISO 45001 & 14001 operational snapshot**.

### SOP — Review the dashboard

1. Confirm your **Organization** if you have choices (label **Organization**; first option may read **Select…** until you pick a site).
2. Read the four clickable cards: **Open incidents**, **Overdue CAPAs**, **Environmental aspects**, **Compliance obligations**—each jumps to the related area.
3. Use **Setup checklist** to track rollout steps; tap a row link to jump; tap **Mark done** once leaders agree work is genuinely in place.
4. Under **Quick actions**, the first button is **Safety metrics** (opens the full metrics page). Other links include **Report incident**, **View incidents**, **CAPA register**, **Documents**, **Planning**, **Audits**, **Tasks**, **CSV import**.

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| A card shows — (dash) | Data still loading—or none yet. Wait; then open the deeper page directly. |
| **Mark done** stuck grey | Wait briefly; refresh; inform IT only if repeatable. |

---

## Metrics (Safety metrics)

The top navigation label is **Metrics**; the page title reads **Safety metrics**. Subheading: leading and lagging indicators scoped to your permissions.

### What this does

Gives coordinators and managers a snapshot of incidents, corrective actions, training renewals, audit nonconformities, environmental reviews, and trend charts—with plain-language definitions and an optional spreadsheet export.

### SOP — Use the Metrics page

1. Open **Metrics** from the dashboard menu or tap **Safety metrics** on Overview (**Quick actions**).
2. Choose **Trailing months** (3, 6, 12, 18, or 24) to adjust how far back charts look.
3. Read the KPI tiles (**Open incidents**, **Open near-miss**, **Overdue CAPAs**, **Training expiring (30d)**, **Open audit NCs**, **Obligations review overdue**, **Mean days to close (closed)**—some may be hidden until data exists). Each tile links to the area that owns that work.
4. Scroll charts such as **Incidents created by month**, **CAPA register by status**, and **All-time incidents by type** when the app has counts to plot.
5. Open **Metric glossary (v1)** on the same page to see how each number is defined (including short **code** labels the app uses internally).
6. To download a summary file, tap **Download CSV** (uses data you are allowed to see; empty sections are omitted from the API and export).

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| **Loading metrics…** stays visible | Wait for the network; reload once. |
| Red error text under the header | Read the message—often permissions or a temporary server issue; retry or ask an administrator. |
| A tile shows **—** | No data yet or the metric does not apply; open the linked module to add records. |
| CSV button stays disabled | Wait until metrics finish loading. |

---

## Incidents

Page title mentions **ISO 45001**.

### SOP — Report an incident

1. Go **Incidents**, then tap **Report incident** (same link exists under Overview quick actions).
2. Choose **Severity** (**low**, **medium**, **high**, **critical**).
3. Enter a clear **Title** (what happened, where).
4. Enter **Description** with who, what, when, safeguards, witnesses if safe to list.
5. Tap **Submit** (shows **Saving…** while storing).
6. You return to **Incidents** list.

Cancel returns without saving via **Cancel**.

### SOP — Review or close incidents

1. Go **Incidents**.
2. Read **Title**, **Severity**, **Status**.
3. If open, tap **Close** on a row once investigation and corrective steps are squared away per your procedure.

Empty state text: **No incidents logged yet.**

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| **Submit** never finishes | Connectivity—retry. If duplicate rows appear unexpectedly, escalate to reconcile with admins. |
| Red error banner under fields | Message tells what failed validation or permissions—adjust text or escalate. |

---

## Corrective actions (CAPA)

Page heading: Corrective actions — ISO 45001 CAPA.

The metrics page’s **CAPA register by status** chart can include **pending approval** and other statuses; on the CAPA workflow screen, statuses generally move forward with **Advance** toward **verified** (exact steps depend on your data and process).

### SOP — Create a CAPA

1. Scroll to **New CAPA**.
2. Enter **Title** (required, at least 3 letters).
3. Optionally add **Details**.
4. Under **Link source**, choose radio option:
   - **None**
   - **Incident** → pick incident from dropdown
   - **Internal audit finding** → choose **Audit**, then choose **Finding (without CAPA yet)**
5. Tap **Create CAPA** (**Saving…** while running).

New rows appear in **Title / Status / Linked incident / Actions** table.

### SOP — Move a CAPA forward

1. Locate the CAPA row.
2. Tap **Advance** until status reads **verified** (then Actions says **Done**).

Empty registry: **No corrective actions yet.**

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| **Advance** ignores click | Busy network—retry. |
| Incident dropdown empty | Record incidents first. |
| Finding dropdown empty | Create audit findings; only findings without CAPA link yet qualify. |

---

## Environment

Page heading: Environment (ISO 14001).

This page mixes four ideas: registers (aspects, obligations), searchable ingested excerpts, AI draft assist, edits.

### SOP — Add an environmental aspect

1. In **Environmental aspects**, fill placeholders:
   - **Aspect name** (required)
   - Optional **Activity / process**
   - Optional **Environmental impact(s)**, **Description**
   - Optional **Site**
   - **Significance** dropdown (**low / medium / high**)
2. Tap **Add aspect**.

### SOP — Update an aspect under “Update aspect”

1. Select existing aspect drop-down (**— Select aspect —** becomes your pick).
2. Adjust fields (**Save changes**).

### SOP — Add a compliance obligation

1. Under **Compliance obligations**, enter required **Title** and **Requirement type** (starter text example: legal, permit—but you define what fits).
2. Optional **Reference code**, **Next compliance review due**.
3. Tap **Add obligation**.

### SOP — Update an obligation (“Update obligation”)

1. Pick **— Select obligation —**.
2. Change fields (**Save obligation**) including **Next review due** date edits.

### SOP — Search the stored knowledge excerpts

Help text in app mentions **RAG** (Retrieval-Augmented Generation style search over ingested uploads).

1. Scroll to **Knowledge base (citations)**.
2. Type at least two characters in search box (**Enter at least 2 characters.** shows until satisfied).
3. Read **Open source** when available for originals.

Possible messages: **Searching…**, **No excerpts matched.**

### SOP — Use AI-assisted draft (must read cautions)

Orange panel: AI proposes structured text only.

1. Type a short factual hint (**Describe the activity …** placeholder).
2. Tap **Propose draft** (needs roughly three typed characters minimum by button rule).
3. Review JSON snippet and automatic **Related corpus citations**.
4. If correct, tap **Apply draft to register**. Otherwise discard via **Discard draft**.

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| **Add aspect / obligation** disabled | Busy—wait retry. Verify required blanks. |
| AI panel disabled | Extend your hint sentence; ensure knowledge sources exist upstream. |

---

## Controlled documents

List page heading: Document control—with note about drafts, approvals, retirement.

Detail page warns when obsolete.

### SOP — Register a new controlled document draft

1. Go **Documents**.
2. Use **Register document** panel: **Title**, **Number**, **Rev.** (defaults to **1.0**).
3. Tap **Add draft** (**Saving…** while busy).

Empty state: **No controlled documents yet.**

### SOP — Approve or retire from list table

Tap **Approve** on **draft**. Tap **Obsolete** when superseded (**obsolete** hides edit ability on detail view).

Statuses display with underscores turned into readable words (draft, approved, obsolete).

### SOP — Open and maintain document detail

1. Tap document title hyperlink.
2. Read status line (**Status:** … Approved date if captured).
3. Use **Approve** / **Mark obsolete** buttons if statuses allow.
4. Under **Revision & metadata**, edit **Title**, **Revision**, **Effective date**, **Evidence URL**.
5. **Save metadata** (**Saving…** while busy).

If document is obsolete: amber note **This document is obsolete; metadata cannot be edited.**

Navigate back via **← Documents**.

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| **Not found.** | Wrong link bookmark or deleted record—open list anew. |

---

## Management review

### SOP — Record a review meeting

Section **Record a review**.

1. Optional **Review date** (hint: blank uses today internally).
2. **Summary & decisions** (minimum 10 characters mandated by form validation).
3. Optional **Action items**.
4. Optional **Next review due**.
5. Tap **Save review** (**Saving…** indicator).

### SOP — Edit an existing entry

Under **Edit a review**, choose **— Select review —**, revise fields (**Save changes**).

### History

Scroll **History** timeline cards with dates.

Empty: **No reviews recorded yet.**

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| Save blocked | Extend summary beyond ten characters—the form enforces completeness. |

---

## Planning

### SOP — Add hazard

Fill **Title** + optional description → **Add hazard**.

### SOP — Record risk assessment

1. Optionally link **Hazard** drop-down (**— Hazard (optional) —**).
2. **Context / scenario** text area (**min 10 chars** enforced).
3. Pick residual rating (**low / medium / high / very high**).
4. Tap **Record assessment**.

### SOP — Add objectives

Pick type (**OH&S** versus **Environmental**), supply **Title**, optional description, **Add objective**. Active objectives show **Mark achieved** link.

### SOP — Add operational control

1. **Title** required.
2. Optionally link hazard and/or environmental aspect (**— Link hazard (optional) —**, **— Link aspect (optional) —**).
3. Tap **Add control**.

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| **Record assessment** disabled | Scenario text too short—add concrete detail. |

---

## Training records

### SOP — Add competence record

1. **Trainee name** & **Course title** required.
2. Optional **Completed on** date picker.
3. Optional **Evidence note** (exam ID, LMS link text, signatures note).
4. Tap **Save** (**Saving…**).

Empty rows: **No training records yet.**

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| Date blank allowed? | Accepted—Completed column displays — until provided. |

---

## Internal audits

### SOP — Schedule audit (“Plan audit”)

1. **Title** required.
2. **Scope** text (**min 10 chars** enforced).
3. Optional **Planned date**.
4. Tap **Create audit** — selection opens automatically afterward.

Statuses across top buttons: planned, in progress, completed (**completed** timestamps completion internally).

### SOP — Add findings after selecting audit

1. Tap audit row highlights it.
2. Under **Findings**, pick **finding type** (observation, minor nc, major nc, opportunity as listed).
3. **Finding title** required; optional **Details**.
4. **Add finding**.

If no CAPA: message indicates create from CAPA workflow.

Empty audit list shows **None yet.**

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| Findings pane says select audit | Tap left list row first. |

---

## Organization context

Page heading cites **Clause 4** auditor shorthand—purpose: scope statement, pressures, allies.

### SOP — Define management scope

1. Compose statement (**Describe the scope of the EHS management system …** helper). Minimum ten characters enforced.
2. Tick **Sites in scope** checkboxes representing physical coverage.
3. **Save scope** (**Saving…** disables button until done).

Loading shows **Loading…**

### SOP — Add internal / external issues

Dropdown **internal** or **external** (shown lower-case raw in form), Category text, Description text (required).

### SOP — Add interested parties

Party name plus optional requirements text → **Add party**.

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| **Save scope** blocked | Extend statement until meaningful (10+ typed characters minimum). |

---

## Tasks

**Task hub** aggregates:

- Open CAPAs assigned to you (**My CAPAs**).
- Obligation deadlines (**Overdue / due obligation reviews** links to Environment).
- **Training expiring (30d)** (links Training).
- **Management reviews due** (links mgmt review hub).

Potential empty placeholders: **None open.**, **None in this window.**, etc.

### SOP — Use Tasks page

1. Open **Tasks** from navigation.
2. Tap any linked title navigating to corrective area owning that item type.

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| **No data.** | Connectivity or unfinished permission setup—reload; escalate if persistent though other pages work. |

---

## Program register

Wide register for operational program evidence.

Sections (matching app blocks):

1. **External parties** – pick party type (**contractor / visitor / temporary worker** casing), Company name → **Add**
2. **Emergency scenarios** – scenario name → **Add scenario**
3. **Emergency drills** – scenario + date (**Log drill**)
4. **Management of change** – Title + Description / scope → **Create MOC** rows show statuses
5. **Certification body audits** – body name & standards scope (**Add CB audit**)
6. **Certificates** – standard, issuing body, scope statement (**Add certificate**)
7. **KPI definitions** – **Add**
8. **Measurements** – value + unit (**Log measurement (now)** records current timestamp listing)

ISO clause tag **8.1.4** appears only beside external parties for auditor mapping.

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| Drill form disabled | Scenario + date mandatory—finish both selects. |

---

## Import CSV

Batch environment aspects and hazards with server-side validation messaging.

### SOP — Environmental aspects CSV

Expect header row. Columns (**name required**, optional **activity**, **description**) per help text—paste spreadsheet-style text → **Import aspects**.

After completion a summary reads **Imported N row(s).** Possibly trailing **Errors:** list concatenated message.

### SOP — Hazards CSV

Columns **title** (required), **description** optional—**Import hazards** identical pattern.

Blank boxes disable import buttons.

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| Partial import failures | Scroll error string; fix offending rows—headers must match spelled column names precisely. |

---

## Appendix A: Micro‑copy pack (tooltips and toasts)

> The screens today mostly use inline banners and muted tables rather than centralized toast banners. Paste these snippets when UX adds overlays.

### Tooltip suggestions (concise hover help)

| Screen / Element | Tooltip text |
|------------------|--------------|
| Organization selector | Pick which site’s records you’re viewing right now. |
| Overview checklist “Mark done” | Mark complete only after leaders confirm the rollout step is truly finished. |
| Nav **Metrics** / **Safety metrics** | Opens charts and definitions for leading and lagging indicators in your organization. |
| Metrics **Trailing months** | Changes how many past months feed the incident trend chart. |
| Metrics **Download CSV** | Saves a spreadsheet of metrics you are allowed to see for audit or leadership packs. |
| Incident Severity | Says how urgent or serious we treat follow-up—not a legal label by itself. |
| CAPA “Link source” | Tie this fix-it plan back to something we already logged (optional but helps traceability). |
| CAPA “Advance” | Move this corrective action forward one lifecycle step at a time. |
| Documents “Approve” | Approves makes this revision the officially active governed copy. |
| Documents “Obsolete” | Retires a document so nobody mistakes it as up to date—metadata locks afterward. |
| Environment knowledge search | Searches excerpts your admins uploaded—not the open internet or live law feeds. |
| AI aspect draft banner | Computers guess—experts double-check citations and wording before Apply. |
| Import CSV textarea | Columns must match the sample header spelling exactly row one. |

### Success toast wording (friendly confirmation)

| After action | Suggested toast |
|--------------|-----------------|
| Incident saved | Incident logged. Stay safe—follow your local response steps. |
| Incident closed | Incident marked closed—good recordkeeping. |
| CAPA created | Corrective action created and linked where you chose. |
| CAPA advanced | Corrective action status updated. Keep owners assigned in your process. |
| Aspect / obligation saved | Saved to the environment register for this workspace. |
| Aspect draft applied | Draft applied—still verify numbers and citations with a human. |
| Document draft added | New draft logged—approve when ready with leadership. |
| Document approved | Document approved—train teams before claiming full rollout. |
| Document obsolete | Document retired—teams should use superseding versions only. |
| Management review saved | Management review logged with dates you entered. |
| Planning items added | Hazard, objective, assessment, or control saved. |
| Training record saved | Training record saved—evidence stays with your QA pack. |
| Audit / finding logged | Audit or finding logged—tie CAPAs early if majors exist. |
| Scope saved | Management system scope saved for auditors and teams. |
| Import done | Imported rows counted—fix any errors banner before retry duplicates. |
| Metrics CSV downloaded *(suggested)* | Spreadsheet saved with the safety metrics your account can view. |

### Error toast / banner wording (plain language)

| Situation | Suggested wording |
|-----------|-------------------|
| Generic login failure | We could not sign you in yet. Check email and password—or ask IT to reset access. |
| Session expired banner | Session ran out—sign back in without losing nerve; re-enter unfinished items calmly. |
| Permission denied mutation | Your role cannot change this—talk to admin for rights or handoff ownership. |
| Validation – short texts | Needs more detail in that box before save (example: summaries under ten characters blocked). |
| Server unexpected | Something failed on save—retry once; escalate with time-of-click if persists. |

---

## Appendix B: For IT administrators (setup notes)

**Audience:** Sandbox engineers or tenant admins—not frontline safety staff.

Topics end users normally should **not** need:

1. **Seeded demo memberships:** Development screens may cite database seed routines and environment variables tying email accounts to workspaces. Operational tenants instead use your identity provider or admin invite workflow.
2. **Sign-up hint text:** The sign-up page may mention running local seed commands during lab builds. Production should route through central account lifecycle.
3. **“No organization membership” engineering panel:** Replace or hide technical instructions in customer-facing builds; keep a support runbook entry mapping symptoms to membership provisioning.

When you modernize UI copy, keep end-user phrasing aligned with Appendix A.

---

*Document generated to match EHS Console routes and visible labels in the application codebase. Update this file when labels or flows change.*
