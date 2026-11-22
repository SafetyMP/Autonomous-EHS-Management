import { fieldStops } from "./case.js";

const shiftNames = { day: "Receiving", night: "Dispatch" };
const state = {
  shift: "day",
  picks: new Set(),
  notes: new Map(),
  handovers: [],
};
const field = document.querySelector("#field");
const main = document.querySelector("main");
const technical = document.querySelector("#technical");

function noteKey(shift, stop) {
  return shift + "/" + stop.id;
}

function coverageTable() {
  const rows = Object.entries(shiftNames).map(([id, name]) => {
    const cells = fieldStops.map((stop) => {
      const logged = state.notes.has(noteKey(id, stop));
      return `<td class="${logged ? "logged" : ""}"><span aria-hidden="true">${logged ? "✓" : "–"}</span><span class="sr-only">${logged ? "Observed" : "Unvisited"}</span></td>`;
    });
    return `<tr><th scope="row">${name}</th>${cells.join("")}</tr>`;
  });
  return `<table class="coverage"><caption>Observation coverage by stop</caption><thead><tr><th scope="col">Shift</th>${fieldStops.map((s) => `<th scope="col"><abbr title="${s.name}">${s.ref}</abbr></th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function render() {
  const shift = state.shift;
  const notes = [...state.notes.values()];
  const seenShifts = new Set(notes.map((item) => item.shift));
  const recent = state.handovers.at(-1);
  field.innerHTML = `
    <section class="round" aria-label="Dock inspection round">
      <div class="sheet"><div class="sheet-head"><div><p class="label">FLOOR PLAN / NORTH DOCK</p><h2>Plan a field round</h2></div><span class="scale">N ↑</span></div>
        <p class="brief">You are the EHS coordinator. Choose a shift and visit up to two stops with its crew. Each stop adds a dated observation to the same handover.</p>
        <fieldset class="shift"><legend>Operating window</legend>${Object.entries(
          shiftNames,
        )
          .map(
            ([id, name]) =>
              `<button type="button" data-shift="${id}" aria-pressed="${shift === id}">${name} <small>${id === "day" ? "07:30" : "21:30"}</small></button>`,
          )
          .join("")}</fieldset>
        <div class="floorplan" role="group" aria-label="Inspection stops"><div class="dock-doors" aria-hidden="true">DOCK DOORS</div><div class="travel-lane" aria-hidden="true"></div><div class="rack rack-one" aria-hidden="true"></div><div class="rack rack-two" aria-hidden="true"></div><div class="crosswalk" aria-hidden="true"></div><span class="lane-label" aria-hidden="true">VEHICLE AISLE →</span>
          ${fieldStops
            .map((stop) => {
              const logged = state.notes.has(noteKey(shift, stop));
              return `<button type="button" class="map-stop ${stop.id}" title="${stop.question}" data-stop="${stop.id}" aria-pressed="${state.picks.has(stop.id)}" ${logged || (!state.picks.has(stop.id) && state.picks.size === 2) ? "disabled" : ""}><b>${stop.ref}</b><span>${stop.name}<small>${logged ? "In notebook" : state.picks.has(stop.id) ? "On route" : "Add stop"}</small></span></button>`;
            })
            .join("")}
        </div>
        <div class="walk"><div><b>${state.picks.size} of 2 stops</b><small>10 minutes per stop in this exercise</small></div><button class="primary" id="walk" ${state.picks.size ? "" : "disabled"}>Walk this route →</button></div>
      </div>
      <section class="notebook" aria-labelledby="notes-heading"><p class="label">SHIFT NOTEBOOK / 14 NOV / CAPA 041</p><h2 id="notes-heading" tabindex="-1">Field observations</h2>
        <p>${notes.length ? `${notes.length} ${notes.length === 1 ? "observation" : "observations"} · ${seenShifts.size} of 2 shifts · ${notes.length * 10} field minutes` : "What evidence would you bring to the next shift? Walk a route to open the first field record."}</p>
        ${coverageTable()}
        ${
          notes.length
            ? `<ol class="entries">${[...notes]
                .reverse()
                .map(({ shift: noteShift, stop }) => {
                  const note = stop[noteShift];
                  return `<li><div class="stamp">${shiftNames[noteShift]} / ${note.time} · STOP ${stop.ref}</div><h3>${stop.name}</h3><p>${note.note}</p><small>Recorded by · ${note.source}</small></li>`;
                })
                .join("")}</ol>`
            : `<div class="empty-note"><b>Inspection brief</b><p>The installation work order is complete. A near miss at this dock occurred during a shift change. The reviewer needs observations of pedestrian access during ordinary work.</p></div>`
        }
      </section>
    </section>
    <section class="handover" aria-labelledby="handover-heading"><div><p class="label">END OF ROUND</p><h2 id="handover-heading">Issue a shift handover</h2><p>Tell the next owner what to do with the observations collected so far. Issuing another handover keeps earlier instructions available for comparison.</p></div>
      <div class="instructions"><label for="disposition">Next owner and instruction</label><select id="disposition"><option value="field">Shift supervisor · plan next round</option><option value="review">CAPA reviewer · assess packet</option><optgroup label="Assign a stop for follow-up">${fieldStops.map((stop) => `<option value="${stop.id}">${stop.owner} · revisit ${stop.name.toLowerCase()}</option>`).join("")}</optgroup></select>
        <button class="primary" id="issue" ${notes.length ? "" : "disabled"}>Issue handover</button></div>
      ${recent ? `<div class="receipt" tabindex="-1" id="receipt"><p class="label">HANDOVER ${String(state.handovers.length).padStart(2, "0")} / ${recent.coverage}</p><h3>${recent.title}</h3><p>${recent.body}</p><small>CAPA 041 remains completed pending human verification.</small></div>` : ""}
      ${
        state.handovers.length > 1
          ? `<details><summary>Earlier handovers (${state.handovers.length - 1})</summary><ol>${state.handovers
              .slice(0, -1)
              .map(
                (h) =>
                  `<li><b>${h.title}</b> · ${h.coverage}<br>${h.body}</li>`,
              )
              .join("")}</ol></details>`
          : ""
      }
    </section>
    <div class="case-footer"><details><summary>Why a second shift matters</summary><p>The decision costs field time. A second operating window can expose changing conditions that a completed installation ticket or a single worker account misses. Track field minutes and handovers that return for more evidence during a pilot.</p><p>The federal materials-handling standard addresses clear aisles and marked permanent passageways. OSHA also recommends involving workers when evaluating controls and checking effectiveness after implementation. Its program evaluation guidance includes corrective-action timeliness. All records and durations here are illustrative.</p><a href="https://www.govinfo.gov/content/pkg/CFR-2024-title29-vol5/xhtml/CFR-2024-title29-vol5-sec1910-176.html">29 CFR 1910.176(a) · Materials handling (2024)</a> · <a href="https://www.govinfo.gov/content/pkg/GOVPUB-L35-PURL-gpo142334/pdf/GOVPUB-L35-PURL-gpo142334.pdf">OSHA 3885 · Control effectiveness and program evaluation (PDF)</a></details><button id="reset" type="button">Start a fresh round</button></div>`;
}

function makeHandover(action) {
  const notes = [...state.notes.values()];
  const seen = new Set(notes.map((item) => item.shift));
  const exception = notes.some(({ shift, stop }) => stop[shift].exception);
  const coverage = `${notes.length} ${notes.length === 1 ? "observation" : "observations"} / ${seen.size} ${seen.size === 1 ? "shift" : "shifts"}`;
  const target = fieldStops.find((stop) => stop.id === action);
  if (target) {
    const records = notes.filter((item) => item.stop === target);
    let body;
    if (records.some(({ shift, stop }) => stop[shift].exception)) {
      body =
        "The night operator’s report is attached. The dispatch lead owns documenting the response and arranging a repeat observation when the bay fills again.";
    } else if (!records.length) {
      body =
        "There is no direct account from this stop in the packet. The lead receives a request for a first observation and a named source.";
    } else {
      const latest = records.at(-1);
      body = `The lead receives the ${latest.stop[latest.shift].time} record from the ${latest.stop[latest.shift].source.toLowerCase()} and a request to compare conditions on the next visit.`;
    }
    return {
      coverage,
      title: `${target.owner} takes the ${target.name.toLowerCase()} follow-up`,
      body,
    };
  }
  if (action === "review") {
    let body;
    if (exception)
      body =
        "The reviewer returns the packet for a repeat observation after the reported staging obstruction. Evidence of the new crossing alone cannot resolve that open question.";
    else if (seen.size < 2)
      body =
        "The reviewer returns the packet for the other shift’s observations. This packet documents only the " +
        shiftNames[notes[0].shift].toLowerCase() +
        " window.";
    else
      body =
        "The reviewer can compare two operating windows and requests a direct field observation at pallet staging during dispatch. Desk and crossing records cannot establish how that bay was used.";
    return { coverage, title: "CAPA reviewer receives the field packet", body };
  }
  return {
    coverage,
    title: "Shift supervisor schedules another round",
    body: exception
      ? "The next round should revisit the reported staging condition and record what workers observe after the site’s response. That repeat visit falls outside this fixed case."
      : seen.size === 1
        ? "The next crew is asked to cover the other operating window and compare its observations with this shift’s record."
        : "Both shifts are represented. The supervisor will check remaining evidence gaps with the crew before routing the packet to the CAPA reviewer.",
  };
}

field.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  let focus;
  if (button.dataset.shift) {
    if (state.shift !== button.dataset.shift) state.picks.clear();
    state.shift = button.dataset.shift;
    focus = '[data-shift="' + state.shift + '"]';
  } else if (button.dataset.stop) {
    const id = button.dataset.stop;
    if (!state.picks.delete(id)) state.picks.add(id);
    focus = '[data-stop="' + id + '"]';
  } else if (button.id === "walk") {
    for (const stop of fieldStops.filter((stop) => state.picks.has(stop.id))) {
      state.notes.set(noteKey(state.shift, stop), { shift: state.shift, stop });
    }
    state.picks.clear();
    focus = "#notes-heading";
  } else if (button.id === "issue") {
    const action = document.querySelector("#disposition").value;
    state.handovers.push(makeHandover(action));
    render();
    document.querySelector("#disposition").value = action;
    document.querySelector("#receipt").focus();
    return;
  } else if (button.id === "reset") {
    state.shift = "day";
    state.picks.clear();
    state.notes.clear();
    state.handovers = [];
    focus = '[data-shift="day"]';
  } else return;
  const instruction = document.querySelector("#disposition").value;
  render();
  document.querySelector("#disposition").value =
    button.id === "reset" ? "field" : instruction;
  document.querySelector(focus).focus();
});

function route(focus) {
  const tech = location.hash === "#/technical";
  main.hidden = tech;
  technical.hidden = !tech;
  main.setAttribute("role", tech ? "none" : "main");
  technical.setAttribute("role", tech ? "main" : "region");
  document.querySelectorAll("header nav a").forEach((a) => {
    if (a.hash === (tech ? "#/technical" : "#/field"))
      a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (focus) (tech ? document.querySelector("#tech-title") : main).focus();
}
document.querySelector("#loading-info").hidden = true;
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  (technical.hidden ? main : document.querySelector("#tech-title")).focus();
});
render();
route(false);
addEventListener("hashchange", () => route(true));
