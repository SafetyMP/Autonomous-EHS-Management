# EHS Console — User manual

Welcome to **EHS Console**—the signed-in experience for **Autonomous EHS**, an integrated management system (IMS) for health, safety, and environment programs. This guide helps safety managers and field workers record activity in plain steps.

**Naming:** **Autonomous EHS** is the product and repo name; **EHS Console** is what you see after sign-in. **Autonomous** means scheduled reminders, escalations, and optional field outbox replay—not automatic approval of incidents or CAPAs.

---

## Table of contents

1. [How to read this guide](#how-to-read-this-guide)
2. [Glossary (words we use)](#glossary-words-we-use)
3. [Before you begin](#before-you-begin)
4. [Signing in and out](#signing-in-and-out)
5. [Your organization (workspace)](#your-organization-workspace)
6. [Moving around the app](#moving-around-the-app)
7. [Command center (operations home)](#command-center-operations-home)
7a. [Your work (next actions)](#your-work)
8. [Metrics (Safety metrics)](#metrics-safety-metrics)
9. [Incidence rates](#incidence-rates)
10. [Incidents](#incidents)
11. [Observations](#observations)
12. [Permits to work](#permits-to-work)
13. [Risk assessments](#risk-assessments)
14. [Inspections](#inspections)
15. [My approvals](#my-approvals)
16. [Corrective actions (CAPA)](#corrective-actions-capa)
17. [Environment](#environment)
18. [Environmental permits](#environmental-permits)
19. [Controlled documents](#controlled-documents)
19a. [Knowledge corpus (RAG ingest)](#knowledge-corpus-rag-ingest)
20. [Management review](#management-review)
21. [Planning](#planning)
22. [Training records](#training-records)
22a. [Contractors & visitors](#contractors--visitors)
23. [Audits (ISO internal audit programme)](#audits-iso-internal-audit-programme)
24. [Organization context (ISO Clause 4)](#organization-context-iso-clause-4)
25. [Tasks & reviews (Task hub)](#tasks-reviews-task-hub)
26. [Program register](#program-register)
26a. [Assurance hub](#assurance-hub)
26b. [Emergency prep](#emergency-prep)
26c. [Management of change (MOC)](#management-of-change-moc)
27. [Import CSV](#import-csv)
28. [Integrations](#integrations)
29. [Data retention & exports](#data-retention--exports)
30. [Workflow catalog (encoded transitions)](#workflow-catalog-encoded-transitions)
31. [Privacy / data subject requests](#privacy--data-subject-requests)
32. [System audit trail](#system-audit-trail)
33. [Appendix A: Micro‑copy pack (tooltips and toasts)](#appendix-a-micro-copy-pack-tooltips-and-toasts)
34. [Appendix B: For IT administrators (setup notes)](#appendix-b-for-it-administrators-setup-notes)

---

## How to read this guide

- **Who this is for:** People who manage safety programs and workers who enter real-world events—not software experts.
- **What you will find here:** Plain definitions, numbered steps (**SOP**), and a **What if things go wrong?** block for each main area.

---

## Glossary (words we use)

| Term | Simple meaning |
|------|----------------|
| **EHS** | Environment, Health, and Safety—the umbrella for keeping people safe and reducing harm to air, water, land, and neighbors. |
| **IMS** | Integrated Management System—one place for incidents, CAPA, documents, training, audits, and related evidence (what Autonomous EHS is built to support). |
| **Autonomous EHS** | Product name for this platform (Apache-licensed software). **Autonomous** refers to scheduled jobs, escalations, and integrations—not AI auto-approving your records. |
| **EHS Console** | The signed-in web application (this manual). |
| **Context Sync** | Optional **administrator** feature on **Integrations** that enables governed REST read access for IDE/agent tools—not the same as **Organization context (ISO 4)** (Clause 4 scope page). |
| **ISO** | A worldwide set of management standards companies can follow so safety and environmental work is repeatable and reviewable (not chaotic). ISO 45001 focuses on workplace safety. ISO 14001 focuses on environmental management. |
| **Incident** | Any unwanted event worth recording: a near miss, an injury concern, unsafe condition, spill, alarm, vehicle issue, etc. |
| **Severity** | How serious the incident could or did become (**low**, **medium**, **high**, **critical**—see the Incident form choices). |
| **CAPA** | Corrective And Preventive Action—a tracked plan to fix a problem so it stays fixed. CAPA rhymes with “map uh.” |
| **TRIR** | **Total Recordable Incident Rate**—often expressed as OSHA recordable cases × **200,000** ÷ **hours worked**. The **Incidence rates** screen builds TRIR-style figures from your IMS recordables and the hours you enter; the product text states this is **not** an official OSHA filing—confirm regulatory submissions with your program owner or counsel. |
| **Environmental aspect** | A workplace activity or condition that interacts with the environment (for example wastewater, trucks, solvents, scrap). |
| **Significance** | Rough strength of environmental impact (**low**, **medium**, **high**) for prioritizing controls. |
| **Compliance obligation** | A duty you monitor—permit, law, regulation, contract item, inspection cycle, etc. |
| **Controlled document** | A formal sheet or procedure that teams must follow, with revision control (draft versus approved versus retired). |
| **Management review** | A periodic leadership checkpoint on the program: decisions, summaries, dates, next review. |
| **Hazard** | A source or situation with potential to harm people (slips, forklifts, noise, chemicals, etc.). |
| **Risk assessment (Planning hub)** | On **Planning**, recording a hazard-linked scenario and assigning a leftover risk rating (**low**, **medium**, **high**, **very high**). |
| **Objective** | A measurable target—for worker safety (**OH&S**, occupational health and safety) or the environment (**Environmental**). |
| **Operational control** | A working rule or method that keeps risk or environmental harm in bounds (often linked to a hazard or environmental aspect). |
| **Internal audit** | Your company checks its own processes against expectations (planned, underway, completed). |
| **Finding** | Something the audit discovers—observations, gaps, strengths, chances to improve. |
| **NC (nonconformance)** | An audit finding that something does not meet a requirement (minor or major). The Metrics screen abbreviates “open audit NCs” for corrective follow-up tied to audits. |
| **RAG / knowledge search** | A search over document text your organization has uploaded and indexed—you see short excerpts and stable references (“citations”) for audit traceability—not live legal advice. |
| **Knowledge base citations** | Search results that quote stored document chunks with identifiers you can cite in records. |
| **Safety observation** | A fast field log of what people saw (safe behavior, at-risk behavior, unsafe condition, other). It is for program learning—not the same as an injury/illness record. |
| **Permit to work (PTW)** | A controlled **work authorization** under **Permits** (**Work permits (PTW)** in the menu). Status moves from draft through approval to active, then completed or cancelled—not the same as **Regulatory env permits** (air / water / waste register). |
| **Environmental permit (regulatory)** | A **program record** for regulatory air / water / waste permits: renewal tracking and links to your environment program—not a permit to perform a specific hot-work or similar task on site. |
| **Risk assessment (register)** | Task-based or site-based risk records on the **Risk assessments** roster; related ISO planning hazards and scenario assessments still live under **Planning**. |
| **MOC** | Management Of Change—for changes to equipment, materials, staffing, layouts, contractors, processes. |
| **Certification body (CB)** | An outside auditing organization that evaluates your management system toward certificate decisions. |
| **CSV** | A simple comma-separated spreadsheet text format—for bulk uploads of certain lists. |
| **Command center** | The operations home at `/dashboard` in **desk** layout: permission-scoped KPI tiles, optional **Needs attention** chips, **Recent activity**, **Quick actions**, and the **ISO setup checklist** (see that chapter). |
| **Field workspace** | A compact home layout with large intake buttons and recent list links. Your organization may open this first; use **Full operations dashboard** to reach the command center. |
| **Operations dashboard** | The full command center layout (versus the compact field menu). |
| **Audit trail** | Menu item **Audit trail** opens the read-only **System audit trail** (who changed what, when)—not ISO **Audits**. Approval buttons still explain that decisions are written to the audit trail behind the scenes. |
| **Retention policy matrix** | Rows your organization defines per jurisdiction and **record class** (what kind of data), with minimum years, what happens after retention (**hold**, **anonymize**, **delete**), and **date anchor**—meanings are counsel-defined; the screen stores the register. |
| **Encoded workflow catalog** | A read-only list of **status → status** transitions baked into the application for each major entity. It is **not** a tenant-configurable workflow builder. |
| **DSAR / privacy intake** | A **request register** row (who asked, what type, notes)—not automatic identity verification, legal review, or a finished data export to the subject. |

**For auditors:** The app mentions “Clause 4” in headings; that aligns with defining context, scope, and interested parties in ISO wording. Your reviewer can expand this glossary as needed.

---

## Before you begin

**What you need**

- Email and password your organization manages (or invites you with).
- A current web browser (Chrome, Safari, Firefox, Edge are typical).
- A rough idea who to call if login fails (“IT” or “EHS coordinator” varies by site).
- *(Optional)* On some browsers (often Chrome or Edge on desktop), you may see **Install EHS on this device**—that adds a home-screen style shortcut; the site still works fully in the tab if you skip it.

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
4. You should land in the **Command center** (full operations dashboard), **Field workspace** (compact intake layout), or another start your administrator configured—both live under `/dashboard`.

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

1. Look in the page header area (top-right on wide screens) for the **Organization** drop-down (**only appears if you belong to more than one**).
2. Choose the correct site name.
3. Wait for counts and lists to refresh.

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| You see **Select an organization** with empty choice | Wrong account or no memberships—talk to your EHS coordinator or administrator. *(If you see confusing technical wording on screen, Appendix B describes what admins run.)* |
| Numbers look wrong after switch | Confirm you switched to the intended site—not a sibling division. Reload once. |

---

## Moving around the app

Navigation is grouped by lifecycle (sidebar on wide screens; **Menu** drawer on phones). Labels below match the live menu source [`src/lib/dashboard-nav-links.ts`](../src/lib/dashboard-nav-links.ts).

| Section | Links (in menu order) |
|---------|----------------------|
| **Today** | **Command center**, **Tasks & reviews**, **Approvals** |
| **Report & respond** | **Incidents**, **Observations**, **Inspections** |
| **Permits** | **Work permits (PTW)**, **Regulatory env permits** |
| **Corrective action** | **CAPA register** |
| **Plan & comply** | **Planning hub**, **Risk assessments**, **Environment** |
| **Assure & improve** | **Internal audits**, **Assurance hub**, **Mgmt review** |
| **Records & metrics** | **Documents**, **Knowledge corpus**, **Audit trail**, **Retention**, **Metrics**, **Incidence rates** |
| **People** | **Training**, **Contractors** |
| **Administration** | **Program overview**, **Emergency prep**, **Management of change**, **Import**, **Integrations**, **Privacy**, **Organization context (ISO 4)**, **Workflow catalog** |

**Home** in the corner returns toward the marketing home page—not always needed during daily tasks.

**Field layout:** If your org defaults to the compact field workspace, the **Administration** section is hidden unless you are an org admin or have integration or audit-trail read access—use **Full operations dashboard** to reach admin routes when permitted.

**Note:** **Audit trail** under **Records & metrics** is the read-only **system audit trail** (who changed what). **Internal audits** under **Assure & improve** is the ISO **internal audit** programme—they are different modules.

---

## Command center (operations home)

In the sidebar this route is labeled **Command center**. The main heading reads **Operations —** *your organization name* (or **Operations command center** if the name is still loading).

The short description under the title: *Permission-scoped snapshot of open work, approvals, permits, inspections, and recent activity across your IMS.*

A **PWA install** strip (**Install EHS on this device**) may appear below the site header on supported browsers—optional shortcut for field use.

### What's new banner

After a major release, a dismissible **What's new** banner may appear at the top of the dashboard. It highlights recent capabilities (for example lifecycle navigation, assurance hub, or incidence rates). Tap **Dismiss** to hide it in your browser; it may reappear when the product ships a new release bundle. This is informational only—it does not change your permissions or records.

### Desk layout versus field layout

- **Desk (operations dashboard):** The sections below describe this layout. Your org may open it by default after sign-in.
- **Field workspace:** You may land on a compact screen titled **Field —** *org* (or **Field workspace**) with subtitle *Quick actions for intake in the field…* Under **Start here**, large buttons match permissions (**Report incident**, **Log observation**, **Start inspection**, **New permit**). A **Pending for you** strip lists up to three ranked items (approvals, due CAPAs). **Recent lists** links include **Incidents**, **Observations**, **Inspections**, and **Work permits (PTW)** when you can read those modules. At the bottom, **Full operations dashboard** switches to desk layout. Your layout preference is remembered in the browser.

## Your work

The **Your work** panel on the desk command center (and the **Pending for you** strip on field home) shows one **primary next action** plus up to four more items, ranked across approvals, CAPAs, training renewals, and compliance reviews you can see.

### SOP — Complete your next action

1. Sign in and open **Command center** (`/dashboard`) or stay on **Field workspace** if that is your default.
2. Read **Your next action** on desk layout—or the top row on the field pending strip.
3. Tap the green button (**Review & decide**, **Open CAPA**, etc.) to open the exact record.
4. For the full ranked list, open **Tasks & reviews** (`/dashboard/tasks`) or **View all tasks** from the Your work panel.
5. Amber sidebar badges on **Tasks & reviews** and **Approvals** show pending counts; they match the same queue where possible.

Desk supervisors still see program **Needs attention** chips and KPI tiles; desk contributors see KPIs collapsed below **Your work** to reduce clutter.

---

### SOP — Review the command center

1. Confirm your **Organization** in the header if you have more than one; until you pick a site you may see **Select an organization** with the picker.
2. Review **Your work** first (see [Your work](#your-work)) before scanning program-wide alerts.
3. Optional: tap **Download command center CSV** (when the snapshot has loaded) to save the command-center figures your account may export—useful for leadership packs or audits.
4. When data loads, note **Snapshot as of** *date/time* under the header (if shown)—figures reflect that moment.
5. If **Needs attention:** appears, read the amber pill links for program-level alerts (personal approvals are deduplicated when shown in **Your work**).
6. Integration backlog and scheduled job health moved to **Integrations** (`/dashboard/integrations`) for administrators. Supervisors may also see a **PortCo pilot proof** panel summarizing integration health when your organization runs a portfolio pilot—details live on **Integrations**, not on the desk home.
7. Under **Key indicators**, scan tiles (supervisors see the full grid; contributors may see them collapsed). Integration and cron panels no longer appear on the desk home.
8. Open **Recent activity** for a timestamped feed; links open record detail.
9. Expand **ISO setup checklist** in the sidebar panel when aligning the management system.
10. Supervisors see **Quick actions** on desk home; field users use the compact field menu instead.
11. Use **Full safety & metrics dashboard →** for the dedicated **Safety metrics** page (`/dashboard/analytics`).

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| A tile shows **—** (dash) | Data still loading—or none yet. Wait; open the target module from the menu. |
| **Loading operations snapshot…** or **Loading workspace…** stays visible | Network delay—reload once; check connection. |
| **Mark done** seems stuck | Wait briefly; refresh; inform IT only if repeatable. |
| You expected KPI tiles but see only the field menu | Your org defaulted to field layout—open **Full operations dashboard** / **Open full operations dashboard**. |

---

## Metrics (Safety metrics)

The top navigation label is **Metrics**; the page title reads **Safety metrics**. Subheading: leading and lagging indicators scoped to your permissions.

### What this does

Gives coordinators and managers a snapshot of incidents, corrective actions, training renewals, audit nonconformities, environmental reviews, field indicators (observations and permits to work), risk-review and regulatory permit renewal cues, SLA escalation summaries, charts, and glossary detail—with plain-language definitions and spreadsheet export (**Download CSV**).

### SOP — Use the Metrics page

1. Open **Metrics** from **Records & metrics**, from **Quick actions** on the command center (**Metrics**), from the **Full safety & metrics dashboard →** link beside the ISO setup checklist, or after opening the full operations dashboard from **Field workspace**. Path: `/dashboard/analytics`.
2. The page headline is **Safety metrics**; subtitle *Leading and lagging indicators scoped to your permissions.* Optional line **Snapshot:** *datetime* reflects generation time when present.
3. Choose **Trailing months** (3, 6, 12, 18, or 24) from the dropdown beside that label—it drives trend windows alongside the headline controls.
4. Read **Operations automation and SLAs** (panel with disclaimer about escalations). When data exists, tiles can include **Observation SLA escalations (90d)** and **Approval SLA escalations (90d)** linking to **Observations** and **Approvals**. This section aligns with anchors used by command-center chips (for example `#operations-sla-escalations`).
5. Scroll further KPI tiles as they load—for example **Open incidents**, **Open near-miss**, **Overdue CAPAs**, **Training expiring (30d)**, **Open audit NCs**, **Obligations review overdue**, **Mean days to close (closed)**, permits-to-work summaries labeled **Active permits** (with expiry rows underneath), observation follow-ups, **At-risk observations (90d)**, etc. Placeholder rows may abbreviate permits as **Active PTW** / **PTW expiring** while counts load; the destinations still point at **`/dashboard/permits`**. Tiles stay hidden without permission or data.
6. Scroll charts such as **Incidents created by month**, **CAPA register by status**, and **All-time incidents by type** when counts exist—plus downstream sections the build exposes (follow-up SLA tables where enabled).
7. Open **Metric glossary (v3)** on the page to see definitions (including short **code** labels used internally).
8. Tap **Download CSV** after data loads—it exports metrics your account may see (empty sections omitted).
9. For **establishment hours**, **TRIR snapshots**, and **recordable investigation rollups**, open **[Incidence rates](#incidence-rates)** under **Records & metrics** (`/dashboard/analytics/incidence-rates`). That page links back to **Safety metrics** when you need the broader KPI dashboard.

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| **Loading metrics…** stays visible | Wait for the network; reload once. |
| Red error text under the header | Read the message—often permissions or a temporary server issue; retry or ask an administrator. |
| A tile shows **—** | No data yet or the metric does not apply; open the linked module to add records. |
| CSV button stays disabled | Wait until metrics finish loading. |

---

## Incidence rates

Menu path: **Records & metrics** → **Incidence rates**. Route: **`/dashboard/analytics/incidence-rates`**.

### Purpose

Shows **derived analytics** from IMS OSHA-recordable incidents and **establishment hours** so you can compute a **recordable incidence rate (TRIR)** using the usual formula (recordable count × 200,000 ÷ effective hours). The page explains this is **OSHA-style** analytics, **not an official OSHA filing**—confirm any regulatory submissions with your program owner or counsel.

### Who uses it

Safety managers, compliance coordinators, and multi-site administrators who maintain **hours worked** by establishment and review **TRIR snapshots** alongside investigation theme rollups.

### SOP — Open and scope the year

1. Under **Records & metrics**, tap **Incidence rates**.
2. If you see **Select an organization**, pick a workspace from the **Organization** control before continuing.
3. Read the title **Incidence rates** and the supporting lines: derived analytics from IMS recordables and establishment hours; **not** an official OSHA filing.
4. Optional: follow **Safety metrics** in the helper line if you want the full **Metrics** dashboard (`/dashboard/analytics`).

### SOP — Choose period and establishment

1. In **Period and establishment**, choose **Calendar year** from the dropdown.
2. Under **Establishment scope**, pick **Organization total (all establishments)** or a specific establishment name.
3. If the page shows **No establishments yet—create one under compliance workflows or seed data before entering hours**, add establishments per your compliance process (or use demo seed data in sandboxes) before saving hours.

### SOP — Compute TRIR and review snapshots

1. Scroll to **Recordable incidence rate (TRIR)**. Read the formula line: *(OSHA recordable count × 200,000) ÷ effective hours worked for the scope and calendar year.*
2. Tap **Compute and save snapshot** (shows **Computing…** while running).
3. When the run finishes, read the status line under the header area—for example **Snapshot saved. Recordable incidence rate (TRIR):** *value* with **Hours source:** and an optional warning **partial monthly hours coverage** when monthly hours are incomplete.
4. Review **Recent TRIR snapshots for selected year** (table): **Computed (UTC)**, **TRIR**, **Recordables**, **Hours**, **Hours source**. A **(partial months)** tag may appear when coverage is partial. Empty state: **No snapshots for this year yet.** While loading: **Loading snapshots…**

### SOP — Enter hours (denominator)

1. Open **Hours worked (denominator)**.
2. If **Establishment scope** is still **Organization total**, the page explains: *Select an establishment to enter monthly or annual hours. Organization scope still uses summed logic across all establishments when you compute TRIR.*
3. After you pick a specific establishment, enter monthly hours under **Jan** through **Dec** (numeric fields). Read the notes: when monthly rows exist, TRIR uses their sum (missing months count as zero); otherwise the annual fallback applies.
4. If **Monthly rows present** appears, it shows a draft sum and reminds you to **save**; **Incomplete month grid** warns TRIR may understate risk if the grid is not full.
5. Tap **Save monthly hours** (shows **Saving…** while storing). Success feedback includes **Monthly hours saved.** Invalid input may show **Invalid hours for month** *N*.
6. Scroll to **Annual summary (fallback)**, used *when no monthly rows exist for this establishment and year.* Enter **Total hours worked** and optional **Average employment (optional)**. Tap **Save annual metrics** (shows **Saving…**). Success: **Annual hours / average employment saved.** Whole-number validation errors: **Annual metrics must be whole numbers.**

### SOP — Investigation themes

1. Open **Investigation themes (IMS-derived)**. Subtext: frequency summaries from structured investigation fields **not** a substitute for formal root cause validation.
2. If present, read amber notices such as recordables **still in draft OSHA determination** or recordables **lack establishment linkage**—the numerator may change after cleanup.
3. Review **Fishbone categories (incidents with causes)** and **Causal factor categories** tables (**Fishbone rollup**, **Causal factor rollup**). Empty rows: **No fishbone data on recordables in this period.** / **No causal factor rows on recordables in this period.**
4. When shown, read **Contributing factors (top)** and the **Recordable incidents** table (**Incidents in scope**) with columns **Title**, **Type**, **Occurred**, **Root cause summary**. Tap a **Title** link to open the incident detail.
5. While themes load: **Loading themes…** Query errors appear as red text under the section.

### What if things go wrong?

| Problem | What to try |
|---------|-------------|
| **Select an organization** blocks the page | Choose the correct site in the header; if you have no membership, ask your site administrator. |
| **No establishments yet** | Create establishments through your compliance workflow or seed data before entering hours. |
| **Compute and save snapshot** shows an error | Read the red status line; fix hours or recordable data, then retry. |
| **Invalid hours** / **Annual metrics must be whole numbers** | Enter whole numbers only; clear bad characters and save again. |
| Themes section shows an error message | Reload; if it persists, your role may lack access or the server returned a temporary error—ask an administrator. |
| You need charts and CSV export for general KPIs | Open **Metrics** (**Safety metrics**) from the link on this page or **Records & metrics**. |

---

## Incidents

Page title mentions **ISO 45001**.

### SOP — Report an incident

1. Go **Incidents**, then tap **Report incident** (same link appears among **Quick actions** on the command center).
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

## Observations

### Purpose

Capture **leading indicators** (what people see in the field) without waiting for a full incident investigation.

### Who uses it

Field staff and supervisors building a culture of proactive feedback; coordinators tracking follow-up.

### SOP — Open the register

1. Under **Report & respond**, open **Observations**.
2. The page title reads **Safety observations** with a note that these are not OSHA 300 log records unless you also file an incident.
3. Tap **Log observation** on an empty list or when adding another entry. The list table columns include **Summary**, **Category**, **Severity**, **Status**, **Observed**, **Actions**.

Empty state: **No observations yet.**

### SOP — Log an observation

1. From the list (**Log observation**), **Quick actions** on the command center, or **Field workspace** (**Log observation**).
2. Optional: tap **Suggest wording (AI)** after typing at least ~10 characters of context across summary and notes; review and edit before saving. (Requires AI and RAG permissions; errors appear under the button.)
3. Enter **Summary** (required—short headline).
4. Choose **Category** (positive behavior, at-risk behavior, unsafe condition, other) and **Severity** (**low**, **medium**, **high**, **critical** display as in the form).
5. Optionally choose **Site (optional)**, **Observed date (optional — defaults now)**, and **Notes (optional)**.
6. Optionally add **Field photos (optional)**—compressed on device; they save with your notes when you submit online (see form hint text).
7. Tap **Save observation** when online, or queue per offline rules below.

**Drafts:** If the app restores text, you see **Restored a draft from this browser** with **Discard draft**.

**Offline:** When offline, you may see **You appear offline — you can queue this observation on this device** if your tenant enables the field outbox; otherwise **You are offline. Connect to submit…** with a draft kept locally. **Photos cannot be queued offline**—remove photos or reconnect before saving. **Save observation** stays unavailable offline when outbox is not enabled.

### SOP — Follow up

Supervisors can set **assignee** and **follow-up due** on the observation detail screen when your process requires it. Past-due follow-ups surface on **Command center** (Needs attention) and **Metrics** for readers with the right permissions.

### What if things go wrong?

| Problem | What to try |
|---------|-------------|
| **Save observation** is disabled | Offline without outbox—reconnect; or remove attached photos if offline queue is on but photos are blocked. |
| Message about notes and photos exceeding a limit | Shorten notes or remove one attachment. |
| **Suggest wording (AI)** stayed grey | Add more factual text (minimum length) until the button enables. |
| You cannot see **Observations** | Your role may not include observation permissions—ask an administrator. |

---

## Permits to work

The sidebar lists this area as **Work permits (PTW)** under **Permits** (`/dashboard/permits`). The roster page heading reads **Work permits**, with subtitle *Controlled work authorizations (draft → approval → active).* **New permit** starts intake.

### Purpose

Track **permits to work** from draft through approval to **active** work, then completion or cancellation—these are **not** regulatory **Environmental permits** (those live under **Permits** → **Regulatory env permits**).

### SOP — Create a permit

1. Under **Permits**, open **Work permits (PTW)**, then **New permit** (also available from command center quick actions).
2. Enter **Title**, **Valid from / Valid to**, and **Work summary** (required). Add **Hazards & controls** when known.
3. Save as **draft**, then use **Submit for approval** when your chain is ready (approver names depend on your process).

### SOP — Act on approvals

Approvers use **Approvals** under **Today**—see [My approvals](#my-approvals). Permit chains and other items appear there when it is your turn in the sequence.

Empty roster: heading **No permits yet**—**Create permit** starts a draft (`/dashboard/permits/new`).

### What if things go wrong?

| Problem | What to try |
|---------|-------------|
| Cannot edit after submit | Only **draft** or **pending approval** rows accept the standard edit form—open the row to read the message. |
| Need retention/legal hold changes | Only administrators with **retention** policy write access use API-level tools today—coordinate with IT if counsel requires holds. |

---

## Risk assessments

Roster route: **`/dashboard/risk-assessments`**. Sidebar label: **Risk assessments**.

### Purpose

Hold **register rows** described in-product as general, task-based (**JSA**-style), and site-based assessments—**distinct from permits to work** and complementary to hazard/scenario work on **Planning**.

### Who uses it

Safety engineers and coordinators who publish JSAs/site profiles beside day-to-day field intake.

### SOP — Browse the roster

1. Under **Plan & comply**, open **Risk assessments**.
2. Header **Risk assessments**; description *Task-based (JSA-style) and site-based registers—separate from permits to work. Full ISO planning tools remain under Planning.*
3. Use filters **Kind** / **Status** under **Filter roster**. Hint copy: *Open a record to edit steps and status. You can still add quick assessments from Planning.*
4. Table columns: **Title / context**, **Kind**, **Status**, **Assessed**, **Actions** (**Open**).
5. When nothing matches filters, empty state reads **No risk assessments match** with **Open planning** (primary) to widen work under **`/dashboard/planning`**.
6. **New assessment** goes to **`/dashboard/risk-assessments/new`**; **Planning hub** links **`/dashboard/planning`**.

### SOP — Create a roster entry (`/risk-assessments/new`)

Header **New risk assessment**; subtitle *General register entry. Use Planning for full ISO registers (objectives, controls). Task-based and site-based kinds use the detail editor after create.*

1. Choose **Assessment kind** (general, task based, site based as listed). Hint: *Task-based and site-based rules are enforced on save (steps / site).*
2. Optionally pick **Hazard link (optional)**.
3. **Site (optional; required for site-based)** — must be filled for site-based saves.
4. Optional **Summary title (optional)**.
5. Fill **Context / scenario (min 10 characters)** (textarea, required length enforced).
6. Choose **Residual risk rating** (**low**, **medium**, **high**, **very high** as shown with underscores flattened in the picker).
7. Tap **Save assessment** (shows busy state while saving). Landing page becomes the assessment detail editor for next steps.

**Task-based rejection:** Selecting **task based** without the required downstream steps yields *Task-based (JSA) assessments need steps. Create a general assessment first, then edit it to add steps — or use Planning.*—follow that guidance.

### SOP — Attention signals

Late risk reviews populate **Risk reviews overdue** KPI tiles plus **Needs attention** chips (**risk review(s) overdue**) pointing back to this roster.

### What if things go wrong?

| Problem | What to try |
|---------|-------------|
| Cannot save site-based assessment | Confirm **Site** is chosen when kind is site-based. |
| Task-based error banner | Follow the message—start general or use **Planning hub**. |

---
## Inspections

### Purpose

Schedule and track workplace inspections (routine, regulatory, pre-job, other) for operational monitoring and ISO 45001-style evidence.

### Who uses it

Coordinators and field leads who run inspections and close them out on time.

### SOP — List and open records

1. Under **Report & respond**, open **Inspections**.
2. Read the description: *Workplace inspections (routine, regulatory, pre-job). Records support ISO 45001 operational monitoring.*
3. Tap **New inspection** to add one, or open a **Title** link to the detail view.
4. The table shows **Title**, **Type**, **Status**, **Scheduled**, **Actions**.

Empty state: **No inspections yet** — use **New inspection**.

### SOP — Create an inspection

1. Tap **New inspection** (from the list, **Quick actions** **Start inspection**, or **Field workspace**).
2. Enter **Title** (required).
3. Choose **Type**: Routine, Regulatory, Pre-job, or Other (as shown).
4. Optionally set **Scheduled date (optional)** and **Notes (optional)**.
5. Optionally add **Field photos (optional)**—same offline rules as observations (photos block offline queue until removed or reconnect).
6. Tap **Create** (shows **Saving…** while busy). You land on the inspection detail page.

**Offline:** If your browser supports the field outbox, you may queue a create while offline; otherwise connect first.

### What if things go wrong?

| Problem | What to try |
|---------|-------------|
| **Create** disabled offline | Reconnect, or confirm outbox is enabled for your tenant. |
| Photo / offline error message | Remove photos or go online—match the banner text. |

---

## My approvals

### Purpose

Shows **pending approval steps assigned to you** so permit, CAPA, and incident workflows can move forward with a clear decision record (written to the system’s **audit trail**—not the same screen as ISO **Audits**).

### Who uses it

Named approvers and deputies who must authorize CAPA plans, permit work, or incident steps.

### SOP — Review and decide

1. Under **Today**, open **Approvals**.
2. Page title **My approvals**; subtitle *Pending serial steps assigned to you. Decisions are written to the audit trail.* For read-only browsing of transactional events organisation-wide (with filters), coordinators with access open **Audit trail** → **[System audit trail](#system-audit-trail)—not ISO **Audits**.
3. Scan the table (**Item**, **Type**, **Due**, **Requested**, **Actions**). Item types include **CAPA plan**, **Work permit**, and **Incident** labels.
4. Tap **Review** on your row. Optionally enter **Comment (optional)**.
5. Submit the correct button: **Approve plan** (CAPA), **Authorize work** (work permit), **Approve** (incident), or **Reject**. Use **Cancel** to close the panel without deciding.
6. When nothing is assigned, you see **No pending approvals for your account.**

### Escalations

If present, **Overdue approval escalations (recorded)** lists steps that passed a due date—visibility for your team; follow your company procedure or administrator if you are stuck.

### What if things go wrong?

| Problem | What to try |
|---------|-------------|
| **Loading…** persists | Network—reload once. |
| Wrong item opens from link | Confirm organization; open **Approvals** again. |
| Escalation list worries you | Treat as a signal to contact your approver chain or site administrator—the product lists overdue steps for awareness. |

---

## Corrective actions (CAPA)

Menu path: **Corrective action** → **CAPA register** (`/dashboard/capa`). Open a single record at **`/dashboard/capa/[id]`** from the register row, **Your work** links, or action-queue deep links.

Page heading: Corrective actions — ISO 45001 CAPA.

The metrics page’s **CAPA register by status** chart can include **pending approval** and other statuses; on the CAPA workflow screen, statuses generally move forward with **Advance** toward **verified** (exact steps depend on your data and process).

On the **CAPA detail** page, a **Source & context** panel lists upstream records (incident, audit finding, obligation, etc.) with links back to those modules. A status stepper shows where the CAPA sits in the lifecycle (`pending_approval` through **verified**).

### SOP — Create a CAPA

1. On the register page, scroll to **New CAPA**.
2. Enter **Title** (required, at least 3 letters).
3. Optionally add **Details**.
4. Under **Link source**, choose radio option:
   - **None**
   - **Incident** → pick incident from dropdown
   - **Internal audit finding** → choose **Audit**, then choose **Finding (without CAPA yet)**
5. Tap **Create CAPA** (**Saving…** while running).

New rows appear in **Title / Status / Linked incident / Actions** table.

### SOP — Move a CAPA forward

1. Open the CAPA from the register (**Open** or row link) to reach the detail page.
2. Review **Source & context** if traceability matters for your audit.
3. Tap **Advance** (labels vary by status—e.g. **Start work**, **Verify effectiveness**) until status reads **verified**.

Empty registry: **No corrective actions yet.**

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| **Advance** ignores click | Busy network—retry. Plan may still need approval—check **Approvals** under **Today**. |
| Incident dropdown empty | Record incidents first. |
| Finding dropdown empty | Create audit findings; only findings without CAPA link yet qualify. |
| Source panel empty on detail | Standalone CAPA with no linked upstream record—expected when **Link source** was **None**. |

---

## Environment

Page heading: Environment (ISO 14001).

This page mixes four ideas: registers (aspects, obligations), searchable ingested excerpts, AI draft assist, edits. Regulatory **air / water / waste permit** registers with renewal windows stay under **[Environmental permits](#environmental-permits)**—not here.

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

## Environmental permits

Route **`/dashboard/environmental-permits`**. Sidebar label: **Regulatory env permits** (under **Permits**).

### Purpose

Maintain a **regulatory permit register** (air / water / waste themes) distinct from **Work permits (PTW)**. The roster explains it is an internal renewal-tracking record—not a government filing inbox.

### Who uses it

Environmental coordinators and managers tracking renewals timed with command-center chips such as **environmental permit(s) in 30d renewal window**.

### SOP — List and filter

1. Open **Environmental permits**.
2. Read description: *Regulatory air / water / waste permit register (program record—not filings). Distinct from permits to work under Field and risk.*
3. Use **Environment hub** to return to **`/dashboard/environment`**; **New permit** opens **`/dashboard/environmental-permits/new`**.
4. Under **Filter roster**, choose **Status**, **Media**, and **Site** as needed—the hint notes this is an internal register for renewal tracking and links—see organisational compliance references as directed on screen.
5. Table columns include **Title**, **Identifier**, **Media**, **Status**, **Expires**, **Actions**.

Empty / no matches state: heading **No permits match** — **New environmental permit** widens intake.

### SOP — Create a regulatory permit record (`/environmental-permits/new`)

1. Page heading **New environmental permit** once an organization is active; subtitle *Create a regulatory permit register row. This is not an agency submission.* **Back to roster** returns to the list.

2. **Identity** section: **Title** (required, min 2 characters), **Permit identifier** (required), optional **Agency** / **Jurisdiction**, selectors for **Media** and **Status** (shown without underscores).

3. **Site (optional)** ties the row to one site when needed.

4. **Dates** section: optional **Issued**, **Effective from**, **Expires** date pickers.

5. **Legal & limits**: optional **Legal citations / notes**; optional **Limits (JSON object)** with helper stating limits validate on save (JSON textarea sample such as `{"no2_lb_hr": 100}` appears as placeholder guidance).

6. **Conditions**: one or more rows with **Condition text** and optional **Reference code (optional)**. **Add condition** appends rows; rows beyond the first offer **Remove**.

7. Tap **Create permit** to submit (busy state disables the button). Success navigates into the permit detail route.

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| Confused versus **Work permits** | Re-read subtitles on both roster pages—they explicitly distinguish regulatory register vs controlled work authorization. |
| Offline creation messages | Mirrors field-outbox policy for environmental permits—photos and queue rules match other intake modules where applicable; reconnect if blocked. |

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

## Knowledge corpus (RAG ingest)

Sidebar label **Knowledge corpus**; page title **Knowledge corpus (RAG)**. Route **`/dashboard/rag`**.

### Purpose

Upload and index **approved text** (policies, procedures, obligation language) for semantic search. Citations may appear on **Environment** drafting—not live legal advice. Distinct from **Controlled documents** (revision-controlled register) and from the Environment page **Knowledge base (citations)** panel (search over indexed chunks).

### Who uses it

Program owners or document administrators with **`rag:ingest`** / **`rag:read`** permissions—not typical field intake roles.

### SOP — Ingest a source

1. Open **Knowledge corpus** from **Records & metrics**.
2. Under **Ingest source**, enter **Title** (required), optional **Source URI**, and **Raw text** (required body).
3. Tap **Ingest** (shows busy state while submitting).
4. Listed sources appear below when ingestion succeeds.

Optional **Backfill embeddings** may appear when your deployment uses vector search—coordinate with administrators if the button is disabled or errors.

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| Permission error | Confirm **`rag:ingest`** on your role—most field users are read-only or have no RAG access. |
| Search empty on Environment | Ingest sources here first; allow time for indexing/backfill per admin runbook. |

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

### Purpose & link to roster

Planning (`/dashboard/planning`) remains the hazards / scenario assessment / objectives / controls workspace. Hint text on **Risk assessments** reminds you that quick assessments can still start here—the roster filters tell users *Open a record to edit steps and status. You can still add quick assessments from Planning.*

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

## Contractors & visitors

Sidebar label **Contractors**; page heading **Contractors & visitors**. Route **`/dashboard/contractors`**, detail **`/dashboard/contractors/[id]`**.

### Purpose

Track **external parties** (contractors, visitors, temporary workers) and their **credentials**—insurance (COI), training proof, permits—with a **renewal queue** for items expiring within 30 days. Aligns with ISO **8.1.4** contractor controls. HRIS sync may populate parties when integrations are configured; otherwise coordinators add records manually.

### Who uses it

EHS coordinators, site access administrators, and supervisors managing vendor compliance—not the same as employee **Training** records.

### SOP — Review portfolio summary

1. Open **Contractors** from **People**.
2. Read tile counts: **Parties**, **Expired**, **Due 30d**, **Active** credentials.
3. Scan **Renewal queue (30 days)**—prioritize expired COI and training before site access.
4. Tap a party name to open detail for credentials and evidence pointers.

### SOP — Add or update credentials (detail page)

1. From the list, open a party record.
2. Add credential type, validity dates, and status per your site SOP.
3. Store file evidence per retention policy—links in the app are pointers, not a document vault replacement.

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| Empty list | No parties yet—create via Program **External parties** admin paths or wait for HRIS **`hris_contractor_sync`** if integrations are live. |
| Queue shows expired items | Block or escalate access per site rules; update credential dates when renewal documents arrive. |

---

## Audits (ISO internal audit programme)

In the sidebar this area is labeled **Internal audits** (**Assure & improve**). Use it to plan ISO-style **internal audits** and record **findings**—do not confuse it with the transactional **audit trail** under **Records & metrics** or approvals on [My approvals](#my-approvals).

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

## Organization context (ISO Clause 4)

Sidebar label **Organization context (ISO 4)**—**not** **Context Sync** (agent REST access; see [Integrations](#integrations)). Page heading cites **Clause 4** auditor shorthand—purpose: scope statement, pressures, allies.

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

## Tasks & reviews (Task hub)

Navigation label: **Tasks & reviews** (path `/dashboard/tasks`).

### What this does

**Task hub** shows your **unified ranked action queue**—the same items surfaced as **Your work** on the command center and **Pending for you** on field home (`tasks.actionQueue`). Items are ranked across approvals, due CAPAs, training renewals, and compliance reviews you can see.

The page may also list **legacy bucket links** when data exists:

- Open CAPAs assigned to you (**My CAPAs**).
- Obligation deadlines (**Overdue / due obligation reviews** links to Environment).
- **Training expiring (30d)** (links Training).
- **Management reviews due** (links mgmt review hub).

Potential empty placeholders: **None open.**, **None in this window.**, etc.

### SOP — Use the Task hub

1. Open **Tasks & reviews** from **Today** (or **Quick actions**).
2. Start with the ranked queue at the top—the green action button opens the exact record (same as **Your work** on the command center).
3. Tap any linked title in the bucket sections below to reach the module owning that item.

See also [Your work](#your-work) on the command center.

### What if things go wrong?

| Problem | What to try |
|---------|-------------|
| **No data.** | Connectivity or unfinished permission setup—reload; escalate if persistent though other pages work. |

---

## Program register

Program administration is split across dedicated routes under **Administration** (and **Assure & improve** for assurance). Source of truth for menu labels: [`src/lib/dashboard-nav-links.ts`](../src/lib/dashboard-nav-links.ts).

### Program overview (`/dashboard/program`)

KPI definitions, measurements, and **External parties** (contractors, visitors, temporary workers). ISO clause tag **8.1.4** appears beside external parties for auditor mapping.

Sections:

1. **External parties** – pick party type (**contractor / visitor / temporary worker** casing), Company name → **Add**
2. **KPI definitions** – **Add**
3. **Program indicator measurements** – value + unit (**Log measurement (now)** records current timestamp listing)

Links at the top point to **[Emergency prep](#emergency-prep)**, **[Management of change (MOC)](#management-of-change-moc)**, and **[Assurance hub](#assurance-hub)** when you need those registers.

### Emergency prep

Route **`/dashboard/emergency`** — sidebar **Administration** → **Emergency prep**. See [Emergency prep](#emergency-prep) for full steps.

### Management of change (MOC)

Route **`/dashboard/moc`** — sidebar **Administration** → **Management of change**. See [Management of change (MOC)](#management-of-change-moc) for full steps.

### Assurance hub

Route **`/dashboard/assurance`** — sidebar **Assure & improve** → **Assurance hub**. See [Assurance hub](#assurance-hub) for full steps.

### Emergency preparedness (`/dashboard/emergency`)

<a id="emergency-prep"></a>

Under **Administration** → **Emergency prep**.

1. **Emergency scenarios** – scenario name → **Add scenario**
2. **Emergency drills** – scenario + date (**Log drill**)

### Management of change (`/dashboard/moc`)

<a id="management-of-change-moc"></a>

Under **Administration** → **Management of change**.

1. **Create MOC** – Title + Description / scope → submit; rows show statuses
2. **Entity links** – filter by MOC to see linked program records

### Assurance hub (`/dashboard/assurance`)

<a id="assurance-hub"></a>

Under **Assure & improve** → **Assurance hub**. Cross-links **internal audits**, open CAPAs, **certification body audits**, and **certificates**—distinct from the transactional **Audit trail** (who changed what in the system).

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| Drill form disabled | Scenario + date mandatory—finish both selects. |
| Administration menu missing on phone | You may be on field layout without admin/integration/audit permissions—open **Full operations dashboard** or ask an org admin. |

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

## Integrations

Route **`/dashboard/integrations`** (sidebar **Administration** → **Integrations**).

### Purpose

Shows recent automated inbound payloads (typically LMS / HRIS) and tooling for troubleshooting connector mappings, webhook delivery, retries, optional exports—not an end-user checklist for frontline responders.

### Who uses it

Identity administrators, integration engineers, anyone granted **integration:read**/**integration:write** (labels appear verbatim in explanatory copy beside controls).

### SOP — Check status

1. Open **Integrations**. Heading **Integrations**. Intro text explains events are readable with **`integration:read`** and points to NDJSON warehouse export—the following paragraphs list inbound URLs, bearer secrets, and doc paths for administrators.
2. **PortCo identity (SCIM & OIDC JIT)** — when your role includes org admin controls, configure **SCIM 2.0** bearer tokens and **group→role mappings**, or **OIDC JIT claim rules** for multi-entity portfolios. Rotate tokens when counsel or IdP policy requires it. Engineering detail: [OIDC_JIT_PROVISIONING.md](./OIDC_JIT_PROVISIONING.md), [hris-portco-integration-playbook.md](./roadmap/hris-portco-integration-playbook.md).
3. **HRIS platform & roster drift** — copy the **inbound URL** and **bearer secret** for iPaaS connectors; pick connector presets (Workday, ADP, BambooHR) when shown. Review **Roster drift** rows after nightly reconciliation; use **Reconcile now** when your runbook calls for manual follow-up. Connector runbooks: [docs/runbooks/](./runbooks/).
4. **Download NDJSON (500 newest)** gathers a downloadable slice once data returns (shows **Preparing export…** while running).
5. **Connector field mapping (operator notes)** stores JSON mapping drafts per connector; pick **Connector** from the drop-down list, edit the textarea JSON, tap **Save mapping** (**Saving…** while storing).
6. **Operational webhooks (org admin)** appears when permitted—under **Subscribe to** tick the operational event codes your stack needs, submit **Add webhook** (**Creating…** while busy), then manage listed endpoints with **Disable**, **Enable**, or **Delete**.
7. **Failed events** (`#integration-failed`, count in heading) lists recent failures requiring **`integration:write`** to tap **Retry** on each row. Success copy may read *Replay queued for worker* depending on orchestration settings.
8. **Recent events (last 100)** table lists timestamps, types, statuses, and IDs when integrations have run (**No integration events recorded for this organization yet** when fresh).

Command center may spotlight **Integration backlog (*N* failed)** with shortcuts back here (`/dashboard/integrations#integration-failed`).

### Context Sync (org administrators)

Separate from **Organization context (ISO 4)** above. When your role includes org admin controls, the **Context Sync (org admin)** panel on this page enables **governed REST read access** for IDE and agent tooling (`/api/contextsync/*`)—tenant opt-in, rate limits, and audit expectations apply. This is **not** a customer MCP server and **not** ISO scope editing. Engineering details: [procurement-integrations-appendix.md](./procurement-integrations-appendix.md).

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| Page errors with permission wording | Confirm your role exposes integration permissions—coordinate with administrators. |
| Retry keeps failing | Copy the surfaced error excerpt and follow internal runbooks cited on-screen (**docs/integration-connector-mapping.md**, etc.). |

---

## Data retention & exports

Route **`/dashboard/retention`** (**Administration** → **Retention**).

### Purpose

Stores your organization’s **retention policy matrix**: which record types stay how long, under which jurisdiction label, and whether the eventual action is **hold**, **anonymize**, or **delete**—with a **date anchor** counselors define. The same screen offers **OSHA injury/illness** structured exports for engineering and evidence packs, clearly separated from “agency-ready” filing formats (those are **not** implemented as filing-ready output). **Legal hold** on a specific incident is still set on the **incident detail** screen, not here.

### Who uses it

Privacy/legal-adjacent administrators, EHS program owners who maintain the retention register, and engineers validating export shape—**not** typical one-tap field intake roles.

### SOP — Review and add retention policies

Page title **Data retention & exports**; subtitle explains org retention matrix and that incident legal hold lives on incident detail.

1. Open **Retention policies**.
2. If no rows exist yet, you see *No policies yet. Add one below.*
3. Read the helper under the form: jurisdiction is free text (examples: `US-Federal`, `EU-GDPR` region code)—**align wording with counsel**.
4. Fill **Jurisdiction** (required), choose **Record class** from the dropdown (`incident_general`, `osha_record`, `gdpr_personal_data`, `controlled_document`, `safety_observation_program`, `work_permit_program`, `environmental_regulatory_permit_program`, `risk_assessment_program`), **Minimum years** (0–200), **Action after retention** (**hold**, **anonymize**, **delete**), and **Date anchor** (**rolling_from_event** or **calendar_year_end**).
5. Tap **Save policy** (shows **Saving…** while submitting).

### SOP — OSHA injury/illness JSON snapshot

Under **OSHA injury/illness snapshot (JSON)**:

1. Read the disclaimer: exports structured sidecar fields linked to incidents; omits ciphertext and detailed PHI; **not** a substitute for legal review or agency formatting.
2. Tap **Download JSON snapshot** (button shows **Exporting…** while running).

### SOP — Agency-formatted export (scaffold)

Under **Agency-formatted OSHA export (scaffold)**:

1. The copy states filing-ready CSV/XML has **not** been implemented—read that before sharing anything externally.
2. Optional: under **Reference CSV sample (not a filing)**, use **Download reference CSV sample** (**Preparing…** while running) only to review column layout. The yellow panel reminds you the file is headers plus one synthetic row for layout review—not OSHA-, state-plan-, or other agency-ready; **consult counsel before any regulatory submission**.
3. If shown, read the **Future reference columns** list as engineering/counsel preview text only.

### What if things go wrong?

| Problem | What to try |
|---------|-------------|
| **Saving…** never finishes or an error appears | Note the message; confirm you have retention write access—your role may be read-only. Retry once; involve IT if permission text appears. |
| JSON export errors | Retry; narrow scope with IT if counsel needs a runbook. |
| Reference CSV looked “official” to someone | Re-read on-screen warnings; treat as scaffold only. |

---

## Workflow catalog (encoded transitions)

Route **`/dashboard/workflow-catalog`** (**Administration** → **Workflow catalog**).

### Purpose

Shows a **read-only snapshot** of which **status → status** transitions exist in application code for major entities—useful for auditors, release notes, and internal alignment. The subtitle states clearly this is **not** a tenant-configurable workflow engine.

### Who uses it

Program owners, internal auditors, IT/release reviewers—unusual for frontline operators.

### SOP — Read or export the catalog

1. Confirm organization context in the header. Before pick: heading may read **Workflow catalog** with org picker only.
2. When loaded, the title reads **Encoded workflow catalog** with supporting muted text (read-only snapshot; not a configurable engine).
3. While loading: *Loading…*
4. On error: read the red message (often permission or network).
5. When data appears, note **Generated** time and **version** on the snapshot line.
6. Optional: tap **Download JSON** to save `workflow-catalog-<org-id>.json` for offline review.
7. Scroll sections: each entity has a heading (**label**), optional notes, and bullet lines where each item shows a **`from` → `to`** transition pair in monospace styling.

### What if things go wrong?

| Problem | What to try |
|---------|-------------|
| **Loading…** sticks | Reload once; check network; ask IT if repeatable. |
| Error text mentions permissions | Your role may not expose **Workflow catalog**—request access from an administrator. |
| JSON download blocked by browser | Allow downloads for this site or try another browser per IT policy. |

---

## Privacy / data subject requests

Route **`/dashboard/privacy-requests`** (**Administration** → **Privacy**).

### Purpose

Records **intakes** for privacy / data-subject-style requests in a simple register: who contacted you, what type of request, optional notes, and ticket status. The page states it does **not** replace legal review, identity verification, or secure delivery—follow your organization’s **DSAR** (or equivalent) process outside the app as required.

### Who uses it

Privacy coordinators, DPO office, HR/legal ops—people who own the intake ledger.

### SOP — Record a new intake

Title **Privacy / data subject requests**; muted intro references following internal process.

1. In **New intake**, enter **Subject contact (e.g. email or internal reference)** (required).
2. Enter **Request type** (free text; default shows `access`—adjust to match your taxonomy).
3. Optionally add **Notes (optional)** in the text area.
4. Tap **Record intake** (shows **Saving…** while busy).

### SOP — Work open tickets

1. Open **Open tickets**.
2. If empty: *No requests yet.*
3. For each row: contact line, then *requestType · status · date*; notes appear when present.
4. Use **Mark in review** when you are actively handling a ticket (hidden when status is already **in_review**).
5. Use **Mark closed** when finished (hidden when status is **closed**).

### What if things go wrong?

| Problem | What to try |
|---------|-------------|
| Save error | Read message; confirm required fields; retry; check role if “permission” appears. |
| Unsure this satisfies GDPR/CCPA | It does not auto-fulfill requests—escalate per counsel; see **Appendix B** for the repository DSAR reference path engineers may see on-screen. |
| Wrong status clicked | Work with your admin—there is no “undo” described on this screen; process may need a new note or ticket. |

---

## System audit trail

Route **`/dashboard/audit-trail`** (**Records & metrics** → **Audit trail**).

### Purpose

Offers a read-only list of transactional **audit events** (**who changed what and when**) with optional exports—explicitly distinct from **[Audits (ISO internal audit programme)](#audits-iso-internal-audit-programme)**.

### Who uses it

Compliance coordinators, auditors, or administrators needing evidence beyond individual approval dialogs.

### SOP — Browse and filter events

Heading **System audit trail**; supporting text warns payloads may hold operational detail needing policy-aligned handling.

1. Expand **Filters** for **Entity type**, **Action**, **Actor user id**, **After (local)** / **Before (local)**.
2. Tap **Apply filters** after entering criteria; **Clear** resets drafts and results.
3. **Events** table shows columns **When (UTC)**, **Action**, **Entity**, **Actor**, **Payload** (expand **View JSON** when present).
4. Empty table message: **No audit events match the current filters.**
5. **Download CSV (up to 2000 rows)** honors currently applied filters; button shows **Preparing CSV…** while generating. Help text reminds each export is itself logged—note for governance teams.

### SOP — Page through rows

Use **Previous page** / **Next page** underneath the grid (buttons disable appropriately while reloading).

### What if things go wrong?

| Problem | What to try |
|---------|--------------|
| **Loading…** stuck | Reload once—large ranges can be slower. Narrow **After/Before**. |
| Unfamiliar payloads | Escalate with privacy/security guidance; do not freely forward JSON externally. |

---

## Appendix A: Micro‑copy pack (tooltips and toasts)

> The screens today mostly use inline banners and muted tables rather than centralized toast banners. Paste these snippets when UX adds overlays.

### Tooltip suggestions (concise hover help)

| Screen / Element | Tooltip text |
|------------------|--------------|
| Organization selector | Pick which site’s records you’re viewing right now. |
| **ISO setup checklist** “Mark done” | Mark complete only after leaders confirm the rollout step is truly finished. |
| **Compact field menu** / **Full operations dashboard** | Switches between the large-button field layout and the full KPI command center for the same organization. |
| **Install EHS on this device** banner | Optional shortcut (common on Chromium browsers); skip if you prefer the normal browser tab. |
| **Download command center CSV** | Exports KPI-style figures tied to your current snapshot for reporting when the button appears. |
| Command center **Needs attention** | Focus pills for items that may need action soon—open the one that matches your role. |
| **Risk assessments** roster | Tracks JSA/site register rows beside **Planning**—distinct from permits to work and environmental permits. |
| **Environmental permits** | Regulatory permit register—not the same intake as **Permits to work.** |
| Integrations retry / backlog | Administrators retry failed LMS/HRIS envelopes or webhook failures when your role permits. |
| **System audit trail** filters | Narrow read-only transactional events before CSV export—not ISO internal audits. |
| Nav **Metrics** / **Safety metrics** | Opens charts and definitions for leading and lagging indicators in your organization. |
| Metrics **Trailing months** | Changes how many past months feed the incident trend chart. |
| Metrics **Download CSV** | Saves a spreadsheet of metrics you are allowed to see for audit or leadership packs. |
| Incident Severity | Says how urgent or serious we treat follow-up—not a legal label by itself. |
| Observation **Suggest wording (AI)** | Suggests text only—humans review before save; needs enough typed context to run. |
| Approvals **Review** | Opens comment and approve/reject choices for your assigned step only. |
| CAPA “Link source” | Tie this fix-it plan back to something we already logged (optional but helps traceability). |
| CAPA “Advance” | Move this corrective action forward one lifecycle step at a time. |
| Documents “Approve” | Approves makes this revision the officially active governed copy. |
| Documents “Obsolete” | Retires a document so nobody mistakes it as up to date—metadata locks afterward. |
| Environment knowledge search | Searches excerpts your admins uploaded—not the open internet or live law feeds. |
| AI aspect draft banner | Computers guess—experts double-check citations and wording before Apply. |
| Import CSV textarea | Columns must match the sample header spelling exactly row one. |
| **Field photos (optional)** | Pictures compress on device and attach to your text when you submit online. |
| **Data retention & exports** | Counsel-defined matrix rows—years, action, anchor—not the same as per-incident legal hold (set on the incident). |
| **Download JSON snapshot** (retention) | Structured OSHA sidecar-style export for engineering review—not guaranteed agency formatting. |
| **Reference CSV sample** (retention scaffold) | Layout-only sample for counsel/engineering—not a filing. |
| **Workflow catalog** | Read-only map of encoded status transitions; export JSON for audit packets. |
| **Privacy / data subject requests** | Intake ledger only—still run identity checks, legal review, and secure delivery your policy requires. |

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
| Retention policy saved *(suggested)* | Retention policy saved—confirm wording with counsel if jurisdictions changed. |
| Privacy intake recorded *(suggested)* | Request logged—finish verification and delivery per your DSAR process. |

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
4. **PWA install prompt:** The `beforeinstallprompt` hook is Chromium-oriented; Safari users often see no install banner—expected.
5. **Field outbox / offline queue:** Tenant configuration controls whether intake can queue offline; engineering detail lives in [offline-field-outbox.md](./offline-field-outbox.md).
6. **Integrations & audit exports:** Inbound secrets, SCIM bearer tokens, OIDC JIT rules, queue toggles (`PG_BOSS_ENABLED`), connector JSON, roster reconciliation cron, and webhook signatures are documented under [integration-connector-mapping.md](./integration-connector-mapping.md), [operational-webhooks.md](./operational-webhooks.md), [hris-portco-integration-playbook.md](./roadmap/hris-portco-integration-playbook.md), and [JOB_QUEUE.md](./JOB_QUEUE.md)—keep those aligned when the **Integrations** or **System audit trail** screens change.
7. **Privacy intakes (DSAR):** The **Privacy** screen may literally cite `docs/DSAR_PROCESS.md` in a code font for operators. In this repository that file is [DSAR_PROCESS.md](./DSAR_PROCESS.md)—for engineering / DPO alignment, not a substitute for your company’s counsel-approved DSAR runbook. Field procedures should point to internal policy, not this path alone.

When you modernize UI copy, keep end-user phrasing aligned with Appendix A.

---

*Document generated to match EHS Console routes and visible labels in the application codebase. Update this file when labels or flows change.*
