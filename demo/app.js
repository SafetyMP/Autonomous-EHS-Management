import { assumptions, packetNames, packetRecord, renderCase } from "./case.js";

const main = document.querySelector("#main");
const source =
  "https://github.com/SafetyMP/Autonomous-EHS-Management/blob/main/";
const phases = {
  source: "Field evidence",
  check: "Review gate",
  record: "Record effect",
};
const trials = {
  installation: {
    label: "13 Nov · Maintenance stop",
    field:
      "13 Nov · Maya recorded the guard installation. Neither working shift has supplied an observation.",
    note: "Installed",
  },
  evening: {
    label: "14 Nov · Shift comparison",
    field:
      "08:10 · Day staff saw the guard in position. 20:40 · The evening operator saw it out of position at the same transfer point.",
    note: null,
  },
  revisit: {
    label: "15 Nov · Repeat visit",
    field:
      "Hypothetical follow-up beyond the business case. After a documented response, both working shifts report the guard in position on their repeat visits.",
    note: "Repeat visits on both shifts documented in the reviewer packet.",
  },
};

function trialResult(fixture, abbreviated) {
  if (fixture.note === null)
    return {
      request:
        "Maya attaches both shift accounts. Alex holds review because the accounts conflict.",
      gate: "Alex holds the review before a transition is submitted. A text-length check cannot decide whether a guard was effective.",
      effect:
        "Human hold · no transition is requested. The original action stays ready for verification.",
      after: "completed",
      writes: 0,
    };
  const note = abbreviated ? "Seen" : fixture.note;
  const length = note.trim().length;
  const eligible = length >= 20;
  return {
    request: `Reviewer submits “${note}” (${length} characters) for completed → verified in this fixture.`,
    gate: eligible
      ? "The fixture assumes CAPA update permission in the action’s organization. The status edge is allowed and the notes satisfy the 20-character check."
      : "The submitted notes are shorter than the required 20 characters. The request fails before the state change.",
    effect: eligible
      ? "Eligible transition · the full application would write the verifier, notes, transition and audit event in one transaction."
      : "Input rejected · no verified status, transition or audit event is written.",
    after: eligible ? "verified" : "completed",
    writes: eligible ? 1 : 0,
  };
}

function known(value, options, fallback) {
  return Object.hasOwn(options, value) ? value : fallback;
}

function readLocation() {
  const [route, query = ""] = location.hash.slice(1).split("?");
  const params = new URLSearchParams(query);
  const saved = {};
  for (const [name, fallback] of Object.entries(assumptions)) {
    const value = params.get(name);
    saved[name] =
      value !== null && /^-?\d{0,11}(?:\.\d{0,8})?$/.test(value)
        ? value
        : fallback;
  }
  const technical =
    route === "/technical" ||
    ["/incidents/INC-1042", "/actions/CAPA-021"].includes(route);
  return {
    view: technical ? "technical" : "case",
    packet: known(params.get("packet"), packetNames, "evening"),
    handoff: ["returned", "advanced"].includes(params.get("handoff"))
      ? params.get("handoff")
      : null,
    trial: known(params.get("trial"), trials, "installation"),
    phase: known(params.get("phase"), phases, "source"),
    abbreviated:
      params.get("trial") === "revisit" && params.get("note") === "short",
    assumptions: saved,
  };
}

function link(view, state) {
  const params = new URLSearchParams();
  if (state.packet !== "evening") params.set("packet", state.packet);
  if (state.handoff) params.set("handoff", state.handoff);
  if (state.trial !== "installation") params.set("trial", state.trial);
  if (state.trial === "revisit" && state.abbreviated)
    params.set("note", "short");
  if (state.phase !== "source") params.set("phase", state.phase);
  for (const [key, base] of Object.entries(assumptions)) {
    if (state.assumptions[key] !== base)
      params.set(key, state.assumptions[key]);
  }
  const query = params.toString();
  return "#/" + view + (query ? "?" + query : "");
}

let selection;
function updateLinks() {
  for (const a of document.querySelectorAll("[data-case-link]"))
    a.href = link("case", selection);
  for (const a of document.querySelectorAll("[data-trace-link]"))
    a.href = link("technical", selection);
  for (const a of document.querySelectorAll("header nav a")) {
    const active =
      selection.view === "case"
        ? a.hasAttribute("data-case-link")
        : a.hasAttribute("data-trace-link");
    if (active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
}

function renderTrace() {
  const { packet, handoff, trial, phase } = selection;
  const selected = packetRecord(packet, handoff);
  const fixture = trials[trial];
  const result = trialResult(fixture, selection.abbreviated);
  const stageText = {
    source: fixture.field,
    check: result.gate,
    record: result.effect,
  };
  const routing =
    handoff === "returned"
      ? "Return for evidence"
      : handoff === "advanced"
        ? "Send to Alex Morgan"
        : "Awaiting your handoff";
  main.innerHTML = `<article class="case-guide" aria-labelledby="trace-heading">
    <p class="case-kicker">TECHNICAL WORKSPACE / NORTH PLANT</p><h1 id="trace-heading">Trace the conveyor-guard packet</h1>
    <p>Inspect the handoff you selected, then replay a verification trial at three stops.</p>
    <section aria-labelledby="selected-heading"><h2 id="selected-heading">Selected case · CAPA-021</h2>
      <ol class="selected-stages"><li><strong>Source</strong><span>INC-1042 → CAPA-021<br>Conveyor 3 · Maya Chen</span></li>
        <li><strong>Packet</strong><span>${packetNames[packet]}<br>${selected.entries.length} dated ${selected.entries.length === 1 ? "record" : "records"}</span></li>
        <li><strong>Handoff</strong><span>${routing}<br>${selected.outcome ? selected.outcome[0] : "No routing choice recorded."}</span></li></ol>
      <details><summary>Read the selected evidence and its consequence</summary>
        <dl class="trace-notes">${selected.entries.map(([origin, text]) => `<div><dt>${origin}</dt><dd>${text}</dd></div>`).join("")}</dl>
        <p>${selected.outcome ? selected.outcome[1] : "The shift coordinator can return the packet or send it to Alex for human review."} The source record stays ready for verification.</p>
      </details><a data-case-link href="#/case">Return to this case and worksheet</a></section>
    <section class="trial" aria-labelledby="trial-heading"><h2 id="trial-heading">Replay a verification trial</h2>
      <p>These synthetic trials compare conditions at the same transfer point. Each trial is independent of the selected case above.</p>
      <label for="trial-picker">Evidence trial</label><select id="trial-picker">${Object.entries(
        trials,
      )
        .map(
          ([id, t]) =>
            `<option value="${id}" ${id === trial ? "selected" : ""}>${t.label}</option>`,
        )
        .join("")}</select>
      <div class="trial-stops" role="group" aria-label="Verification trace stops">${Object.entries(
        phases,
      )
        .map(
          ([id, name]) =>
            `<button type="button" data-phase="${id}" aria-pressed="${id === phase}">${name}</button>`,
        )
        .join("")}</div>
      ${trial === "revisit" && phase !== "source" ? `<label for="note-picker">Verification notes on the same repeat visit</label><select id="note-picker"><option value="full">Both shifts documented</option><option value="short" ${selection.abbreviated ? "selected" : ""}>Abbreviated entry · “Seen”</option></select>` : ""}
      <div class="trial-card" aria-live="polite"><h3>${phases[phase]}</h3><p>${stageText[phase]}</p>${phase === "check" ? `<p class="trial-request">${result.request}</p>` : ""}</div>
      ${phase === "record" ? `<p class="model-effect"><strong>Modeled record</strong> <code>completed → ${result.after}</code> · ${result.writes} new transition ${result.writes === 1 ? "entry" : "entries"}. The browser makes no writes.</p>` : ""}
      <a id="trial-permalink" data-trace-link href="#/technical">Permalink to this trial and stop</a>
    </section>
    <details><summary>Check the implementation and tests</summary>
      <p>The <a href="${source}src/server/trpc/routers/capa.ts">CAPA router</a> checks permission and organization, validates notes, and records a successful transition and its audit together. The <a href="${source}src/lib/workflow/capaTransitions.ts">transition table</a> admits completed → verified.</p>
      <p>With repository dependencies installed, run <code>npx vitest run tests/unit/workflow/capaTransitions.test.ts</code> to check allowed and denied status pairs. The <a href="${source}tests/unit/workflow/capaTransitions.test.ts">unit tests</a> check workflow edges. The shift observations and reviewer decisions here are illustrative fixtures.</p>
    </details>
  </article>`;
}

function show() {
  selection = readLocation();
  const canonical = link(selection.view, selection);
  if (location.hash !== canonical) history.replaceState(null, "", canonical);
  if (selection.view === "technical") renderTrace();
  else
    renderCase(main, selection, (delta) => {
      Object.assign(selection, delta);
      history.replaceState(null, "", link("case", selection));
      updateLinks();
    });
  updateLinks();
}

function selectTrial(trial, phase, focus) {
  if (selection.trial !== trial) selection.abbreviated = false;
  selection.trial = trial;
  selection.phase = phase;
  history.replaceState(null, "", link("technical", selection));
  renderTrace();
  updateLinks();
  main.querySelector(focus).focus();
}
main.addEventListener("change", (event) => {
  if (event.target.id === "note-picker") {
    selection.abbreviated = event.target.value === "short";
    selectTrial(selection.trial, selection.phase, "#note-picker");
  } else if (event.target.id === "trial-picker")
    selectTrial(event.target.value, "source", "#trial-picker");
});
main.addEventListener("click", (event) => {
  const button = event.target.closest("[data-phase]");
  if (button)
    selectTrial(
      selection.trial,
      button.dataset.phase,
      '[data-phase="' + button.dataset.phase + '"]',
    );
});
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  main.focus();
});
show();
addEventListener("hashchange", () => {
  show();
  main.focus();
});
