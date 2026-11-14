/* Static demonstration only. No API, authentication, storage, or record mutations. */
"use strict";

const icons = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  actions: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 12l2 2 4-4M9 17h6"/>',
  incidents: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
  audits: '<path d="M14 3H5v18h14V8l-5-5ZM14 3v5h5M8 12h8M8 16h5"/>',
  programs: '<path d="M12 3 3 7v6c0 4 9 8 9 8s9-4 9-8V7l-9-4Z"/><path d="m8 12 3 3 5-6"/>',
  reports: '<path d="M4 3v18h17M8 16v-5M13 16V6M18 16V9"/>',
  arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
};
const navigation = [
  { route: "overview", name: "Overview", keywords: "home dashboard" },
  { route: "actions", name: "Actions & approvals", keywords: "CAPA corrective preventive tasks review" },
  { route: "incidents", name: "Incidents & observations", keywords: "report incident hazard near miss" },
  { route: "audits", name: "Audits & inspections", keywords: "assurance inspection findings" },
  { route: "programs", name: "Programs & risks", keywords: "training contractors environmental permits risk" },
  { route: "reports", name: "Reports & evidence", keywords: "metrics documents audit trail reporting" },
];
const incidents = [
  { id: "INC-1042", title: "Unguarded transfer point at conveyor 3", site: "North plant", location: "Packaging · Line 3", type: "Near miss", severity: "High", status: "Under review", reported: "12 Nov 2026", owner: "Maya Chen", initials: "MC", capa: "CAPA-021", description: "During a routine walkthrough, an operator identified an exposed transfer point beside conveyor 3. The observation was reported before an injury occurred. The sample investigation links the finding to a corrective action and its verification evidence.", response: "The sample record documents that the line was stopped, the area isolated, and the supervisor notified. These are fictional recorded events, not instructions for a real incident." },
  { id: "INC-1041", title: "Oil residue identified beside loading bay", site: "River distribution", location: "Receiving · Bay 2", type: "Hazard observation", severity: "Medium", status: "Under review", reported: "11 Nov 2026", owner: "Jordan Ellis", initials: "JE", capa: "CAPA-020", description: "An employee reported oil residue on the floor during a receiving-area inspection. The sample record links the observation to an equipment repair and inspection of the surrounding area.", response: "The fictional shift record notes that access was restricted while the spill was addressed and the equipment was inspected." },
  { id: "INC-1040", title: "Forklift pedestrian crossing visibility", site: "North plant", location: "Warehouse · Aisle 4", type: "Near miss", severity: "High", status: "Under review", reported: "10 Nov 2026", owner: "Alex Morgan", initials: "AM", capa: "CAPA-019", description: "A sample near-miss report identifies limited visibility at the pedestrian crossing at the end of aisle 4. The associated action is assigned to the warehouse team.", response: "The sample record includes a supervisor briefing and a temporary change to the affected route pending review." },
  { id: "INC-1039", title: "Damaged step on access platform", site: "River distribution", location: "Maintenance · Platform B", type: "Hazard observation", severity: "Medium", status: "Closed", reported: "08 Nov 2026", owner: "Sam Rivera", initials: "SR", capa: "CAPA-018", description: "A damaged platform step was identified in a sample inspection. A replacement was recorded, followed by a separate verification review.", response: "The sample history records restricted use until repair and a subsequent review before closure." },
  { id: "INC-1038", title: "Unlabeled container in storage area", site: "North plant", location: "Stores · Cabinet 2", type: "Hazard observation", severity: "Low", status: "Closed", reported: "06 Nov 2026", owner: "Maya Chen", initials: "MC", capa: null, description: "A sample observation recorded an unlabeled container. The fictional review documented identification and a follow-up inventory check.", response: "The example was reviewed by the site team and closed with a record of the follow-up check." },
  { id: "INC-1037", title: "Obstructed walkway during delivery", site: "River distribution", location: "Receiving · East walkway", type: "Hazard observation", severity: "Low", status: "Closed", reported: "03 Nov 2026", owner: "Jordan Ellis", initials: "JE", capa: null, description: "A sample delivery observation recorded packaging obstructing a walkway. The record includes the team's response and supervisor review.", response: "The fictional record notes that the obstruction was removed and the delivery-area layout was reviewed." },
];
const actions = [
  { id: "CAPA-021", title: "Install fixed guarding at conveyor 3", incident: "INC-1042", site: "North plant", owner: "Maya Chen", initials: "MC", status: "Ready for verification", due: "16 Nov 2026", overdue: false, step: 3, description: "The sample action addresses the exposed transfer point documented in INC-1042. Installation has been recorded by the action owner. A separate reviewer must examine the evidence before this record can be verified.", evidence: "Guarding installation record", reviewer: "Alex Morgan", date: "13 Nov 2026" },
  { id: "CAPA-020", title: "Repair leaking loading-bay equipment", incident: "INC-1041", site: "River distribution", owner: "Jordan Ellis", initials: "JE", status: "In progress", due: "13 Nov 2026", overdue: true, step: 2, description: "The sample maintenance action addresses the equipment associated with the oil-residue observation. Work is recorded as in progress, with completion evidence still pending.", evidence: "Maintenance work order", reviewer: "Sam Rivera", date: "12 Nov 2026" },
  { id: "CAPA-019", title: "Improve visibility at aisle 4 crossing", incident: "INC-1040", site: "North plant", owner: "Alex Morgan", initials: "AM", status: "In progress", due: "18 Nov 2026", overdue: false, step: 2, description: "The sample action records a planned change to the crossing layout and sight lines. The owner will attach completion evidence for a separate verification review.", evidence: "Crossing-layout review", reviewer: "Maya Chen", date: "11 Nov 2026" },
  { id: "CAPA-018", title: "Replace damaged access-platform step", incident: "INC-1039", site: "River distribution", owner: "Sam Rivera", initials: "SR", status: "Verified", due: "10 Nov 2026", overdue: false, step: 4, description: "The sample repair was completed and reviewed by another person. Verification evidence was recorded before closure of the linked incident.", evidence: "Repair completion and verification record", reviewer: "Jordan Ellis", date: "10 Nov 2026" },
];
const audits = [
  { id: "AUD-026", title: "Machine safeguarding walkthrough", site: "North plant", date: "12 Nov 2026", owner: "Alex Morgan", status: "Follow-up open", findings: "1 linked finding", incident: "INC-1042" },
  { id: "AUD-025", title: "Receiving-area inspection", site: "River distribution", date: "11 Nov 2026", owner: "Sam Rivera", status: "Follow-up open", findings: "1 linked finding", incident: "INC-1041" },
  { id: "AUD-024", title: "Access equipment review", site: "River distribution", date: "10 Nov 2026", owner: "Jordan Ellis", status: "Complete", findings: "Follow-up verified", incident: "INC-1039" },
];
let scope = "all";
let listSearch = "";
let statusFilter = "all";
const listPreferences = { incidents: { search: "", status: "all" }, actions: { search: "", status: "all" } };
const main = document.getElementById("main");
const dialog = document.getElementById("mobile-menu");
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.overview}</svg>`;
const scoped = (rows) => rows.filter((row) => scope === "all" || row.site === scope);
const badge = (text, variant = "plain") => `<span class="badge badge-${variant}">${escapeHtml(text)}</span>`;
const statusBadge = (status) => badge(status, ["Closed", "Verified", "Complete"].includes(status) ? "success" : status === "Ready for verification" ? "success" : "warning");
const severityBadge = (severity) => badge(severity, severity === "High" ? "danger" : severity === "Medium" ? "warning" : "plain");
const person = (name, initials) => `<span class="person"><span class="avatar" aria-hidden="true">${escapeHtml(initials)}</span>${escapeHtml(name)}</span>`;
const button = (href, label, primary = false) => `<a class="button${primary ? " button-primary" : ""}" href="${href}">${label}${icon("arrow")}</a>`;
const routePath = () => location.hash.startsWith("#/") ? location.hash.slice(2) : "overview";
const currentArea = () => routePath().split("/")[0];

function renderNavigation(container, query = "") {
  const filter = query.trim().toLowerCase();
  const results = navigation.filter((item) => `${item.name} ${item.keywords}`.toLowerCase().includes(filter));
  container.innerHTML = `<label class="nav-search"><span>Find a workspace</span><input type="search" placeholder="Search navigation…" value="${escapeHtml(query)}" data-nav-search autocomplete="off"></label><div class="nav-group-label">WORKSPACE</div><nav class="nav-list" aria-label="EHS work areas">${results.map((item) => `<a class="nav-item" href="#/${item.route}"${currentArea() === item.route ? ' aria-current="page"' : ""}>${icon(item.route)}<span>${item.name}</span>${item.route === "actions" ? `<span class="nav-count" aria-label="${scoped(actions).filter((action) => action.status !== "Verified").length} open sample actions">${scoped(actions).filter((action) => action.status !== "Verified").length}</span>` : ""}</a>`).join("")}${results.length ? "" : '<p class="nav-empty" role="status">No matching workspace. Try incidents, CAPA, or reports.</p>'}</nav>`;
}
function refreshNavigation() {
  for (const id of ["desktop-nav", "mobile-nav"]) renderNavigation(document.getElementById(id));
}
function header(eyebrow, title, description, links = "") {
  return `<div class="page-header"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${links ? `<div class="page-actions">${links}</div>` : ""}</div>`;
}
function breadcrumb(area, title, route) {
  return `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/overview">Overview</a><span aria-hidden="true">/</span><a href="#/${route}">${area}</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(title)}</span></nav>`;
}
function incidentRows(rows) {
  return rows.map((record) => `<tr><td><a class="record-title" href="#/incidents/${record.id}">${escapeHtml(record.title)}</a><span class="record-subtitle">${record.id} · ${record.type}</span></td><td>${record.site}<br><span class="record-subtitle">${record.location}</span></td><td>${severityBadge(record.severity)}</td><td>${statusBadge(record.status)}</td><td><a class="table-arrow" href="#/incidents/${record.id}" aria-label="Open ${record.id}">↗</a></td></tr>`).join("");
}
function incidentTable(rows) {
  return rows.length ? `<div class="table-scroll"><table><caption class="sr-only">Synthetic incident records</caption><thead><tr><th scope="col">Incident</th><th scope="col">Site & location</th><th scope="col">Severity</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Open record</span></th></tr></thead><tbody>${incidentRows(rows)}</tbody></table></div>` : '<div class="empty-state"><h2>No matching sample incidents</h2><p>Change the site, search, or status filter to explore more records.</p></div>';
}
function overview() {
  const openIncidents = scoped(incidents).filter((record) => record.status !== "Closed");
  const openActions = scoped(actions).filter((record) => record.status !== "Verified");
  const ready = openActions.filter((record) => record.status === "Ready for verification");
  const overdue = openActions.filter((record) => record.overdue);
  const priority = ready[0] || openActions[0];
  const activity = scoped(actions).slice(0, 3);
  return header("CORPORATE OVERVIEW", "See what needs your attention.", `${scope === "all" ? "Across two sample sites" : escapeHtml(scope)}. A clear path from reported issue to verified action.`, button(`#/incidents/${scoped(incidents)[0].id}`, "Explore a sample case", true)) +
    `<div class="stats-grid"><a class="stat-card" href="#/incidents"><div class="stat-label">Open incidents ${icon("incidents")}</div><div class="stat-value">${openIncidents.length.toString().padStart(2, "0")}</div><div class="stat-foot">${scoped(incidents).length} total sample records</div></a><a class="stat-card" href="#/actions"><div class="stat-label">Open corrective actions ${icon("actions")}</div><div class="stat-value">${openActions.length.toString().padStart(2, "0")}</div><div class="stat-foot">${overdue.length ? `<strong>${overdue.length} past its sample due date</strong>` : "All within their sample due dates"}</div></a><a class="stat-card" href="#/actions"><div class="stat-label">Ready for verification ${icon("programs")}</div><div class="stat-value">${ready.length.toString().padStart(2, "0")}</div><div class="stat-foot">A human review is the next step</div></a></div>
    <div class="two-column"><section class="card priority-card"><div class="eyebrow"><span class="status-dot" aria-hidden="true"></span> NEXT IN THE SAMPLE WORKFLOW</div>${priority ? `<div class="priority-heading"><div class="record-icon">${icon("actions")}</div><div>${statusBadge(priority.status)}<h3>${priority.title}</h3><div class="meta-line"><span>${priority.id}</span><span aria-hidden="true">·</span><span>${priority.site}</span><span aria-hidden="true">·</span><span>Due ${priority.due}</span></div></div></div><div class="progress-track" aria-hidden="true">${[1, 2, 3, 4].map((step) => `<span${step <= priority.step ? ' class="done"' : ""}></span>`).join("")}</div><div class="progress-caption"><span>Assigned → implemented → reviewed</span><span>${priority.status}</span></div><div class="priority-bottom">${person(priority.owner, priority.initials)}${button(`#/actions/${priority.id}`, "View corrective action", true)}</div>` : '<p>No open sample actions for this site.</p>'}</section><section class="card"><div class="section-header"><h2>Recent activity</h2><span class="badge badge-plain">Sample history</span></div><ol class="activity-list">${activity.map((action) => `<li><strong>${action.owner}</strong> ${action.status === "Verified" ? "recorded verification of" : action.status === "Ready for verification" ? "submitted evidence for" : "updated"} <a href="#/actions/${action.id}">${action.id}</a><time>${action.date} · ${action.site}</time></li>`).join("")}</ol></section></div>
    <section class="card card-flush"><div class="card-heading"><div class="section-header"><h2>Recent incidents & observations</h2><a href="#/incidents">View all records →</a></div></div>${incidentTable(scoped(incidents).slice(0, 3))}<div class="table-footer"><span>Connected records. Clear ownership. Traceable follow-up.</span><a href="#/about">About sample data</a></div></section>`;
}
function filters(kind) {
  const options = kind === "incidents" ? ["Under review", "Closed"] : ["In progress", "Ready for verification", "Verified"];
  return `<div class="filter-bar"><label class="search-field"><span class="sr-only">Search ${kind === "incidents" ? "incidents" : "corrective actions"}</span><input data-list-search type="search" placeholder="Search by title, ID, or owner…" value="${escapeHtml(listSearch)}"></label><label>Status <select data-status-filter><option value="all">All statuses</option>${options.map((status) => `<option${statusFilter === status ? " selected" : ""}>${status}</option>`).join("")}</select></label><span class="count-label" id="result-count" role="status" aria-live="polite"></span></div>`;
}
function filtered(rows) {
  const query = listSearch.toLowerCase();
  return scoped(rows).filter((record) => `${record.id} ${record.title} ${record.owner}`.toLowerCase().includes(query) && (statusFilter === "all" || record.status === statusFilter));
}
function incidentsPage() {
  return header("INCIDENTS & OBSERVATIONS", "Every report has a next step.", "Follow a sample record from initial report through investigation and linked corrective action.", button(`#/incidents/${scoped(incidents)[0].id}`, "Open the sample walkthrough", true)) + filters("incidents") + '<section class="card card-flush" id="list-results" aria-label="Incident results"></section>';
}
function actionTable(rows) {
  return rows.length ? `<div class="table-scroll"><table><caption class="sr-only">Synthetic corrective actions</caption><thead><tr><th scope="col">Corrective action</th><th scope="col">Owner</th><th scope="col">Due date</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Open action</span></th></tr></thead><tbody>${rows.map((action) => `<tr><td><a class="record-title" href="#/actions/${action.id}">${action.title}</a><span class="record-subtitle">${action.id} · ${action.site} · from ${action.incident}</span></td><td>${person(action.owner, action.initials)}</td><td>${action.due}${action.overdue ? '<br><span class="badge badge-warning">Overdue in sample</span>' : ""}</td><td>${statusBadge(action.status)}</td><td><a class="table-arrow" href="#/actions/${action.id}" aria-label="Open ${action.id}">↗</a></td></tr>`).join("")}</tbody></table></div>` : '<div class="empty-state"><h2>No matching sample actions</h2><p>Change the site, search, or status filter to explore more records.</p></div>';
}
function actionsPage() {
  return header("ACTIONS & APPROVALS", "Turn findings into verified action.", "Accountable owners, visible due dates, and evidence for the person who verifies the work.") + `<div class="note" style="margin-bottom:20px">This demo illustrates corrective-action review. Approval decisions and record changes belong to the full self-hosted application.</div>` + filters("actions") + '<section class="card card-flush" id="list-results" aria-label="Corrective action results"></section>';
}
function updateList() {
  const area = currentArea();
  const container = document.getElementById("list-results");
  if (!container) return;
  const rows = filtered(area === "incidents" ? incidents : actions);
  container.innerHTML = area === "incidents" ? incidentTable(rows) : actionTable(rows);
  document.getElementById("result-count").textContent = `${rows.length} sample ${rows.length === 1 ? "record" : "records"}`;
}
function incidentDetail(id) {
  const record = incidents.find((item) => item.id === id);
  if (!record) return notFound();
  const action = actions.find((item) => item.id === record.capa);
  return breadcrumb("Incidents & observations", record.id, "incidents") + header(`${record.id} · SYNTHETIC INCIDENT`, record.title, `${record.site} / ${record.location}`, button("#/incidents", "Back to incidents")) +
    `<div class="detail-grid"><div class="detail-stack"><section class="card"><div class="section-header"><h2>What was reported</h2>${statusBadge(record.status)}</div><p class="detail-copy">${record.description}</p><dl class="definition-grid"><div><dt>Report type</dt><dd>${record.type}</dd></div><div><dt>Reported severity</dt><dd>${severityBadge(record.severity)}</dd></div><div><dt>Reported on</dt><dd>${record.reported}</dd></div><div><dt>Record owner</dt><dd>${person(record.owner, record.initials)}</dd></div></dl><details class="disclosure"><summary>View the recorded initial response</summary><p>${record.response}</p></details></section>
    <section class="card"><div class="section-header"><h2>Corrective action</h2><span class="badge badge-plain">${action ? "1 linked action" : "No linked actions"}</span></div><p class="detail-copy">${action ? "The source report stays connected to the action, its owner, and its verification evidence." : "This sample observation was reviewed and closed without a separate corrective-action record."}</p>${action ? `<a class="linked-record" href="#/actions/${action.id}" aria-label="${escapeHtml(action.title)}"><span><small>${action.id} · ${action.owner}</small><strong>${action.title}</strong>${statusBadge(action.status)}</span>${icon("arrow")}</a>` : ""}</section></div>
    <aside class="detail-stack" aria-label="Incident context"><section class="card"><h2>Record context</h2><dl class="definition-list"><div><dt>Organization</dt><dd>Meridian Industries · fictional</dd></div><div><dt>Site</dt><dd>${record.site}</dd></div><div><dt>Location</dt><dd>${record.location}</dd></div><div><dt>Record source</dt><dd>Synthetic demonstration fixture</dd></div></dl></section><div class="note"><strong>Follow the connection.</strong><br>Open the linked action to see how an owner records work and a separate reviewer examines evidence. This demonstration cannot submit or close records.</div></aside></div>`;
}
function actionDetail(id) {
  const action = actions.find((item) => item.id === id);
  if (!action) return notFound();
  const source = incidents.find((item) => item.id === action.incident);
  const steps = ["Assigned", "In progress", "Ready for verification", "Verified"];
  return breadcrumb("Actions & approvals", action.id, "actions") + header(`${action.id} · SYNTHETIC CORRECTIVE ACTION`, action.title, `${action.site} · Linked to ${action.incident}`, button(`#/incidents/${action.incident}`, "Return to source incident")) +
    `<div class="detail-grid"><div class="detail-stack"><section class="card"><div class="section-header"><h2>Action & progress</h2>${statusBadge(action.status)}</div><p class="detail-copy">${action.description}</p><ol class="steps" aria-label="Sample action progress">${steps.map((step, index) => `<li${index < action.step ? ' class="done"' : ""}${index === action.step - 1 ? ' aria-current="step"' : ""}><strong>${step}</strong>${index === action.step - 1 ? "Current sample state" : index < action.step ? "Recorded" : "Pending"}</li>`).join("")}</ol></section>
    <section class="card"><div class="section-header"><h2>Evidence & review</h2><span class="badge badge-plain">Sample excerpt</span></div><div class="linked-record"><span><small>Evidence record · ${action.date}</small><strong>${action.evidence}</strong><small>Recorded by ${action.owner}</small></span>${icon("audits")}</div><details class="disclosure"><summary>Read sample evidence details</summary><p>${action.status === "Verified" ? `The fictional record contains a completion entry from ${action.owner} and a separate verification entry from ${action.reviewer}. The associated incident is marked closed in this sample snapshot.` : action.status === "Ready for verification" ? `The fictional completion entry records the installation and references a site inspection. ${action.reviewer} is the named reviewer. The action remains ready for verification; the sample does not treat an uploaded record or AI output as verified closure.` : `The fictional record describes work in progress. Completion evidence and review are still pending. This excerpt is illustrative and is not an uploaded document.`}</p></details><div class="note"><strong>${action.status === "Verified" ? "Human verification recorded in this sample." : "Human verification is a distinct step."}</strong><br>The full package retains permission checks and an audit trail. This demo has no approval or closure controls.</div></section>
    <section class="card"><h2>Source incident</h2><a class="linked-record" href="#/incidents/${action.incident}" aria-label="${escapeHtml(source.title)}"><span><small>${action.incident}</small><strong>${source.title}</strong><small>${source.site} · ${source.location}</small></span>${icon("arrow")}</a></section></div>
    <aside class="detail-stack" aria-label="Action context"><section class="card"><h2>Accountability</h2><dl class="definition-list"><div><dt>Action owner</dt><dd>${person(action.owner, action.initials)}</dd></div><div><dt>Due date</dt><dd>${action.due}${action.overdue ? " · Overdue in sample" : ""}</dd></div><div><dt>Verification reviewer</dt><dd>${action.reviewer}</dd></div><div><dt>Site</dt><dd>${action.site}</dd></div></dl></section><section class="card"><h2>Sample timeline</h2><ol class="activity-list"><li>Source incident reported<time>${source.reported}</time></li><li>Action assigned to ${action.owner}<time>${source.reported}</time></li><li>${action.status}<time>${action.date}</time></li></ol></section></aside></div>`;
}
function auditsPage() {
  return header("AUDITS & INSPECTIONS", "Connect findings to follow-through.", "Explore sample inspections and trace each finding to its incident and corrective action.") +
    `<section class="card card-flush"><div class="table-scroll"><table><caption class="sr-only">Synthetic audits and inspections</caption><thead><tr><th scope="col">Inspection</th><th scope="col">Site</th><th scope="col">Reviewer</th><th scope="col">Follow-up</th><th scope="col">Finding</th></tr></thead><tbody>${scoped(audits).map((audit) => `<tr><td><span class="record-title">${audit.title}</span><span class="record-subtitle">${audit.id} · ${audit.date}</span></td><td>${audit.site}</td><td>${audit.owner}</td><td>${statusBadge(audit.status)}<br><span class="record-subtitle">${audit.findings}</span></td><td><a href="#/incidents/${audit.incident}">View ${audit.incident} →</a></td></tr>`).join("")}</tbody></table></div><div class="table-footer"><span>${scoped(audits).length} sample inspections · read only</span></div></section><div class="note" style="margin-top:22px">The walkthrough shows connected sample records. Audit scheduling, checklists, and findings management are part of the full package and are not simulated here.</div>`;
}
function programsPage() {
  return header("PROGRAMS & RISKS", "Keep the wider program in view.", "An illustrative program map, with links into the sample records and the full package documentation.") +
    `<div class="program-grid"><section class="card program-card"><span class="record-icon">${icon("programs")}</span><h2>Operational risk</h2><p>Use observations and inspection findings to identify work that needs ownership and verification.</p><dl class="definition-grid"><div><dt>Sample coverage</dt><dd>${scoped(incidents).length} connected observations</dd></div><div><dt>Follow-up</dt><dd>${scoped(actions).length} corrective actions</dd></div></dl><p style="margin-top:19px;margin-bottom:0"><a href="#/incidents">Explore incident records →</a></p></section><section class="card program-card"><span class="record-icon">${icon("audits")}</span><h2>Inspection & assurance</h2><p>Trace inspection findings to source records, accountable owners, and the evidence used during review.</p><dl class="definition-grid"><div><dt>Sample coverage</dt><dd>${scoped(audits).length} inspection records</dd></div><div><dt>Available interaction</dt><dd>Follow a finding</dd></div></dl><p style="margin-top:19px;margin-bottom:0"><a href="#/audits">Explore inspections →</a></p></section><section class="card program-card"><span class="badge badge-plain">Full package · outside this demo</span><h2>Environmental & work programs</h2><p>Environmental permits, chemical inventory, work permits, and other program modules remain in the self-hosted package. Availability and maturity differ by module.</p><a href="https://github.com/SafetyMP/Autonomous-EHS-Management/blob/main/docs/module-maturity.md">Read module maturity →</a></section><section class="card program-card"><span class="badge badge-plain">Full package · outside this demo</span><h2>People & management systems</h2><p>Training, contractor, management-review, and organization-context surfaces remain part of the package. This walkthrough does not simulate their workflows.</p><a href="https://github.com/SafetyMP/Autonomous-EHS-Management/blob/main/docs/user-manual-ehs-console.md">Read the user manual →</a></section></div>`;
}
function reportsPage() {
  const records = scoped(incidents);
  const open = records.filter((record) => record.status !== "Closed").length;
  const high = records.filter((record) => record.severity === "High").length;
  const evidence = scoped(actions);
  const bySite = ["North plant", "River distribution"].filter((site) => scope === "all" || scope === site).map((site) => ({ site, count: records.filter((record) => record.site === site).length }));
  return header("REPORTS & EVIDENCE", "Read the signal. Follow the source.", "Counts calculated from the synthetic records in this demo, with a path back to the underlying work.") +
    `<div class="two-column"><section class="card"><div class="section-header"><h2>Sample incident status</h2><span class="badge badge-plain">November snapshot</span></div><p class="detail-copy">${records.length} total sample incidents and observations in the selected scope.</p><div class="chart" role="img" aria-label="${open} under review and ${records.length - open} closed sample records"><div class="chart-col"><span>${open}</span><div class="chart-bar" style="height:${open / Math.max(records.length, 1) * 140}px"></div></div><div class="chart-col"><span>${records.length - open}</span><div class="chart-bar" style="height:${(records.length - open) / Math.max(records.length, 1) * 140}px;background:#bdd2bd"></div></div></div><div class="chart-labels"><span>Under review</span><span>Closed</span></div><div class="report-callout"><strong>${high}</strong><span>sample records have a reported High severity.<br><a href="#/incidents">Inspect the source records →</a></span></div></section><section class="card"><h2>By sample site</h2><p class="detail-copy">Record counts, not a comparison of actual site performance.</p><dl class="definition-list">${bySite.map((row) => `<div><dt>${row.site}</dt><dd>${row.count} incidents & observations</dd></div>`).join("")}</dl><div class="note" style="margin-top:23px">No real-world rates, compliance determinations, or performance claims are made from these fixtures.</div></section></div>
    <section class="card card-flush"><div class="card-heading"><h2>Evidence connected to actions</h2><p class="detail-copy" style="margin-bottom:0">Open an action to inspect its sample evidence and source incident.</p></div><div class="table-scroll"><table><caption class="sr-only">Sample action evidence index</caption><thead><tr><th scope="col">Evidence</th><th scope="col">Action</th><th scope="col">Recorded by</th><th scope="col">Review state</th></tr></thead><tbody>${evidence.map((action) => `<tr><td><span class="record-title">${action.evidence}</span><span class="record-subtitle">Synthetic excerpt · ${action.date}</span></td><td><a href="#/actions/${action.id}">${action.id} →</a></td><td>${action.owner}</td><td>${statusBadge(action.status)}</td></tr>`).join("")}</tbody></table></div></section>`;
}
function aboutPage() {
  return header("ABOUT THIS DEMO", "A clear view of the workflow.", "A lightweight, public walkthrough of Autonomous EHS. The complete application is available as a self-hosted package.") +
    `<section class="card about-body"><h2>What you can explore</h2><p>Navigate the corporate workspace, filter sample records by site or status, open an incident, follow its corrective action, and inspect a sample evidence excerpt. Every destination in this walkthrough uses fictional data bundled with the page.</p><h2>What this demonstration does</h2><ul><li>Runs entirely in your browser with static files. It makes no application API requests.</li><li>Shows read-only synthetic records. It has no sign-in, uploads, submissions, approvals, or record changes.</li><li>Uses a fixed sample snapshot dated 14 November 2026. Dates and statuses do not represent a live organization.</li></ul><h2>Keep the full EHS package</h2><p>The self-hosted application retains its database, authentication, permission checks, audit trail, and human-controlled workflow. This public demo does not replace those services or demonstrate production readiness. Module maturity is documented separately.</p><div class="page-actions">${button("https://github.com/SafetyMP/Autonomous-EHS-Management", "View the package", true)}${button("https://github.com/SafetyMP/Autonomous-EHS-Management/blob/main/docs/self-host-quickstart.md", "Self-hosting guide")}</div><h2>Human accountability remains central</h2><p>Optional AI in the full package can assist with wording. People review evidence and close records. This demonstration is not safety advice, a compliance assessment, or an official filing tool.</p><p><a href="https://github.com/SafetyMP/Autonomous-EHS-Management/blob/main/docs/module-maturity.md">Review module maturity</a> · <a href="https://github.com/SafetyMP/Autonomous-EHS-Management/blob/main/docs/user-manual-ehs-console.md">Read the user manual</a></p></section>`;
}
function notFound() {
  return header("WORKSPACE", "That sample record is not available.", "Choose a destination from the navigation or return to the overview.", button("#/overview", "Return to overview", true));
}
function render(focus = false) {
  const path = routePath();
  const [area, id, extra] = path.split("/");
  if (!id && Object.hasOwn(listPreferences, area)) {
    listSearch = listPreferences[area].search;
    statusFilter = listPreferences[area].status;
  }
  const views = { overview, incidents: incidentsPage, actions: actionsPage, audits: auditsPage, programs: programsPage, reports: reportsPage, about: aboutPage };
  let html;
  if (!extra && id && area === "incidents") html = incidentDetail(id);
  else if (!extra && id && area === "actions") html = actionDetail(id);
  else if (!id && Object.hasOwn(views, area)) html = views[area]();
  else html = notFound();
  main.innerHTML = html;
  updateList();
  const areaName = navigation.find((item) => item.route === area)?.name || (area === "about" ? "About this demo" : "Workspace");
  document.getElementById("current-area").textContent = areaName;
  document.title = `${main.querySelector("h1").textContent} · Autonomous EHS demo`;
  refreshNavigation();
  if (dialog.open) dialog.close();
  if (focus) {
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }
  document.getElementById("route-status").textContent = `${areaName} loaded. Synthetic demonstration data.`;
}

document.getElementById("open-menu").addEventListener("click", () => dialog.showModal());
document.getElementById("close-menu").addEventListener("click", () => dialog.close());
dialog.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const focusable = Array.from(dialog.querySelectorAll("button, input, a[href], select, summary"))
    .filter((element) => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length > 0 && getComputedStyle(element).visibility === "visible");
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
dialog.addEventListener("click", (event) => { if (event.target === dialog && event.clientX > dialog.getBoundingClientRect().right) dialog.close(); });
dialog.addEventListener("click", (event) => { if (event.target.closest("a[href^='#/']")) dialog.close(); });
window.matchMedia("(min-width: 761px)").addEventListener("change", (event) => { if (event.matches && dialog.open) dialog.close(); });
window.addEventListener("hashchange", () => render(true));
document.querySelector(".skip-link").addEventListener("click", (event) => { event.preventDefault(); main.focus(); });
document.getElementById("site-scope").addEventListener("change", (event) => {
  const allowed = ["all", "North plant", "River distribution"];
  scope = allowed.includes(event.target.value) ? event.target.value : "all";
  listSearch = "";
  statusFilter = "all";
  for (const preference of Object.values(listPreferences)) { preference.search = ""; preference.status = "all"; }
  if (routePath().split("/").length > 1) location.hash = "#/overview";
  else render();
});
document.addEventListener("input", (event) => {
  if (event.target.matches("[data-nav-search]")) {
    const container = event.target.parentElement.parentElement;
    const position = event.target.selectionStart;
    const query = event.target.value;
    renderNavigation(container, query);
    const input = container.querySelector("input");
    input.focus({ preventScroll: true });
    if (typeof position === "number") input.setSelectionRange(position, position);
  }
  if (event.target.matches("[data-list-search]")) { listSearch = event.target.value; listPreferences[currentArea()].search = listSearch; updateList(); }
});
document.addEventListener("change", (event) => {
  if (event.target.matches("[data-status-filter]")) { statusFilter = event.target.value; listPreferences[currentArea()].status = statusFilter; updateList(); }
});
render();
