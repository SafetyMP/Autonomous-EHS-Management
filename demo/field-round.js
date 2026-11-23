/* Synthetic observations for a desk exercise. Quotations are fictional. */
const fieldStops = [
  {
    id: "crossing",
    owner: "Floor supervisor",
    name: "Marked crossing",
    ref: "A",
    question: "Where do pedestrians cross the vehicle aisle?",
    day: {
      time: "07:40",
      source: "EHS observation",
      note: "During the inbound wave, four people used the marked crossing. The gate opened onto the marked walkway each time.",
    },
    night: {
      time: "21:45",
      source: "Night shift lead",
      note: "Two pickers used the marked crossing during the first dispatch wave. The lead did not observe the later changeover.",
    },
  },
  {
    id: "staging",
    owner: "Dispatch lead",
    name: "Pallet staging",
    ref: "B",
    question: "Does the pedestrian route remain clear as loads change?",
    day: {
      time: "07:50",
      source: "Receiving operator",
      note: "The staging bay was half full. I could walk from the receiving door to the crossing without entering the vehicle aisle.",
    },
    night: {
      time: "21:55",
      source: "Dispatch operator",
      note: "Returns occupied the end of the marked walkway during dispatch. I reported the obstruction and the supervisor held movements in that area.",
      exception: true,
    },
  },
  {
    id: "desk",
    owner: "Handover coordinator",
    name: "Dispatch desk",
    ref: "C",
    question: "What gets passed between shifts?",
    day: {
      time: "08:00",
      source: "Day handover sheet",
      note: "The day team recorded the new crossing and its location. The handover sheet has no entry for the evening dispatch wave.",
    },
    night: {
      time: "22:05",
      source: "Dispatch radio log",
      note: "The supervisor acknowledged a staging call during the dispatch wave. The radio log does not contain a field check of the route after the call.",
    },
  },
];

const shifts = { day: "Receiving", night: "Dispatch" };
const shiftKeys = Object.keys(shifts);
const stops = fieldStops.map((stop) => stop.id);
const instructions = ["field", "review", ...stops];
const records = new Map();
for (const shift of shiftKeys) {
  for (const stop of fieldStops) {
    const key = shift + "-" + stop.id;
    records.set(key, { key, shift, stop, ...stop[shift] });
  }
}

function validList(raw, allowed) {
  return [
    ...new Set((raw || "").split(".").filter((key) => allowed.includes(key))),
  ];
}

export function normalizeRound(params) {
  const shift = params.get("rshift") === "night" ? "night" : "day";
  const notes = validList(params.get("rnotes"), [...records.keys()]);
  const picks = validList(params.get("rpicks"), stops)
    .filter((id) => !notes.includes(shift + "-" + id))
    .slice(0, 2);
  const instruction = params.get("rowner");
  const handovers = [];
  for (const entry of params.getAll("rh")) {
    const [action, count, extra] = entry.split(".");
    if (
      extra === undefined &&
      instructions.includes(action) &&
      /^[1-6]$/.test(count) &&
      Number(count) <= notes.length
    ) {
      handovers.push({ action, notes: notes.slice(0, Number(count)) });
    }
  }
  return {
    shift,
    notes,
    picks,
    handovers,
    instruction: instructions.includes(instruction) ? instruction : "field",
  };
}

export function writeRound(params, state) {
  for (const key of ["rshift", "rnotes", "rpicks", "rowner", "rh"])
    params.delete(key);
  if (state.shift !== "day") params.set("rshift", state.shift);
  if (state.notes.length) params.set("rnotes", state.notes.join("."));
  if (state.picks.length) params.set("rpicks", state.picks.join("."));
  if (state.instruction !== "field") params.set("rowner", state.instruction);
  for (const handover of state.handovers)
    params.append("rh", handover.action + "." + handover.notes.length);
}

function observationCount(notes) {
  return notes.length + (notes.length === 1 ? " observation" : " observations");
}

function describeHandover(handover) {
  if (!handover) return null;
  const notes = handover.notes.map((id) => records.get(id));
  const seen = new Set(notes.map((item) => item.shift));
  const coverage =
    observationCount(notes) +
    " across " +
    seen.size +
    (seen.size === 1 ? " shift" : " shifts");
  const exception = notes.some((item) => item.exception);
  const target = fieldStops.find((stop) => stop.id === handover.action);
  if (target) {
    const latest = notes.filter((item) => item.stop.id === target.id).at(-1);
    let body =
      "The packet has no direct account from this stop. The lead requests a first observation with a time and a named source.";
    if (target.id === "staging" && exception) {
      body =
        "The dispatch lead receives the operator’s report and owns documenting the response and arranging a repeat observation during dispatch.";
    } else if (latest) {
      body =
        "The lead receives the " +
        latest.time +
        " entry from the " +
        latest.source.toLowerCase() +
        " and will compare conditions on the next visit.";
    }
    return {
      title:
        target.owner + " takes the " + target.name.toLowerCase() + " follow-up",
      coverage,
      body,
    };
  }
  if (handover.action === "review") {
    let body =
      "The reviewer asks for a direct observation at pallet staging during dispatch. The notebook covers both shifts; their other observations leave that location and time open.";
    if (exception)
      body =
        "The reviewer returns the packet. The dispatch operator reported an obstruction. The dispatch lead must document the response and obtain a repeat field observation.";
    else if (seen.size === 1)
      body =
        "The reviewer returns the packet for observations from the other shift. All the attached records come from " +
        shifts[notes[0].shift].toLowerCase() +
        ".";
    return { title: "CAPA reviewer receives the field packet", coverage, body };
  }
  let body =
    "The next supervisor has observations from both shifts and will check which locations still need a visit before referring the packet.";
  if (exception)
    body =
      "The next supervisor requests a repeat visit to pallet staging after the site’s response. That later visit falls outside this fixed exercise.";
  else if (seen.size === 1)
    body =
      "The next supervisor asks the other shift to record its operating conditions so the two crews’ accounts can be compared.";
  return { title: "Shift supervisor schedules another round", coverage, body };
}

export function roundSummary(state) {
  const notes = state.notes.map((key) => records.get(key));
  return {
    count: notes.length,
    shifts: new Set(notes.map((item) => item.shift)).size,
    minutes: notes.length * 10,
    exception: notes.some((item) => item.exception === true),
    latest: describeHandover(state.handovers.at(-1)),
  };
}

export function roundEvidence(state) {
  return {
    shift: shifts[state.shift],
    entries: state.notes.map((key) => {
      const item = records.get(key);
      return [
        shifts[item.shift] +
          " · " +
          item.stop.name +
          " · " +
          item.time +
          " · " +
          item.source,
        item.note,
      ];
    }),
    handoff: describeHandover(state.handovers.at(-1)),
  };
}

function notebookEntry(key) {
  const item = records.get(key);
  return `<li><strong>${item.stop.name}</strong><small>${shifts[item.shift]} · ${item.time} · ${item.source}</small><p>${item.note}</p></li>`;
}

function draw(element, state, traceHref) {
  const { count, shifts: visited, minutes, latest } = roundSummary(state);
  const hasRoute = state.picks.length > 0;
  const remaining = state.notes.slice(0, -1).reverse();
  element.innerHTML = `<section class="dock-round" aria-labelledby="dock-round-title">
    <p class="case-kicker">North dock floor plan · 14 November</p>
    <h2 id="dock-round-title">Plan a field round</h2>
    <div class="dock-layout"><div class="dock-field">
    <fieldset class="dock-shifts"><legend>Choose a shift</legend>${shiftKeys.map((shift) => `<button type="button" data-round-shift="${shift}" aria-pressed="${shift === state.shift}">${shifts[shift]} · ${shift === "day" ? "07:30" : "21:30"}</button>`).join("")}</fieldset>
    <p id="dock-route-hint">Pick up to two stops on the map, then walk the route.</p>
    <div class="dock-map" role="group" aria-label="North dock inspection stops" aria-describedby="dock-route-hint">
      <span class="dock-doors" aria-hidden="true">Dock doors</span><i class="dock-aisle" aria-hidden="true"></i><i class="dock-crosswalk" aria-hidden="true"></i><i class="dock-racks" aria-hidden="true"></i>
      ${fieldStops
        .map((stop) => {
          const logged = state.notes.includes(state.shift + "-" + stop.id);
          const picked = state.picks.includes(stop.id);
          return `<button type="button" class="dock-pin dock-pin-${stop.id}" data-round-stop="${stop.id}" aria-pressed="${picked}" ${logged || (!picked && state.picks.length >= 2) ? "disabled" : ""}><b>${stop.ref}</b><span>${stop.name}<small>${logged ? "Recorded" : picked ? "On route" : "Add stop"}</small></span></button>`;
        })
        .join("")}
    </div>
    <div class="dock-walk"><span>${state.picks.length} of 2 stops · ${state.picks.length * 10} min</span><button type="button" data-round-walk ${hasRoute ? "" : "disabled"}>Walk this route</button></div></div>
    <section class="dock-notebook" aria-labelledby="dock-notes-title">
      <h3 id="dock-notes-title" tabindex="-1">Field notebook</h3>
      ${
        count
          ? `<p class="dock-tally">${observationCount(state.notes)} · ${visited} of 2 shifts · ${minutes} field min</p>
      <ol class="dock-entries">${notebookEntry(state.notes.at(-1))}</ol>
      ${remaining.length ? `<details><summary>Earlier observations (${remaining.length})</summary><ol class="dock-entries">${remaining.map(notebookEntry).join("")}</ol></details>` : ""}`
          : "<p>Walking a route opens a dated note from each stop. Each visit takes ten minutes in this exercise.</p>"
      }
    </section></div>
    ${
      count
        ? `<section class="dock-handover" aria-labelledby="dock-owner-heading"><h3 id="dock-owner-heading">Who needs these observations?</h3>
    <label for="dock-instruction">Next owner</label>
    <div class="dock-owner"><select id="dock-instruction"><option value="field">Shift supervisor · plan the next round</option><option value="review">CAPA reviewer · assess the packet</option><optgroup label="Assign a stop for follow-up">${fieldStops.map((s) => `<option value="${s.id}">${s.owner} · revisit ${s.name.toLowerCase()}</option>`).join("")}</optgroup></select><button type="button" data-round-issue>Issue handover</button></div>
    ${latest ? `<div class="dock-receipt" tabindex="-1" id="dock-receipt"><small>Handover ${state.handovers.length} · ${latest.coverage}</small><h4>${latest.title}</h4><p>${latest.body}</p><p><strong>Record status</strong> · CAPA-041 remains completed, pending human verification.</p></div>` : ""}
    ${
      state.handovers.length > 1
        ? `<details><summary>Earlier handovers (${state.handovers.length - 1})</summary><ol>${state.handovers
            .slice(0, -1)
            .map((h) => {
              const receipt = describeHandover(h);
              return `<li><strong>${receipt.title}</strong> · ${receipt.coverage}<p>${receipt.body}</p></li>`;
            })
            .join("")}</ol></details>`
        : ""
    }
    <div class="dock-links"><a data-round-trace>Trace this dock packet</a><button type="button" data-round-reset>Start a fresh round</button></div>
    </section>`
        : ""
    }
  </section>`;
  const instruction = element.querySelector("#dock-instruction");
  if (instruction) instruction.value = state.instruction;
  const link = element.querySelector("[data-round-trace]");
  if (link) link.href = traceHref;
}

export function renderRound(element, state, onChange, traceHref) {
  function update(next, focus) {
    state = next;
    draw(element, state, traceHref);
    onChange(state);
    element.querySelector(focus)?.focus();
  }
  draw(element, state, traceHref);
  element.onchange = (event) => {
    if (
      event.target.id === "dock-instruction" &&
      instructions.includes(event.target.value)
    ) {
      state = { ...state, instruction: event.target.value };
      onChange(state);
    }
  };
  element.onclick = (event) => {
    const button = event.target.closest("button");
    if (!button || button.disabled || !element.contains(button)) return;
    const { roundShift, roundStop } = button.dataset;
    if (roundShift) {
      if (state.shift !== roundShift)
        update(
          { ...state, shift: roundShift, picks: [] },
          '[data-round-shift="' + roundShift + '"]',
        );
    } else if (roundStop) {
      const picks = state.picks.includes(roundStop)
        ? state.picks.filter((id) => id !== roundStop)
        : [...state.picks, roundStop];
      update({ ...state, picks }, '[data-round-stop="' + roundStop + '"]');
    } else if (button.hasAttribute("data-round-walk")) {
      const added = state.picks.map((id) => state.shift + "-" + id);
      update(
        { ...state, picks: [], notes: [...state.notes, ...added] },
        "#dock-notes-title",
      );
    } else if (button.hasAttribute("data-round-issue")) {
      const handover = { action: state.instruction, notes: [...state.notes] };
      update(
        { ...state, handovers: [...state.handovers, handover] },
        "#dock-receipt",
      );
    } else if (button.hasAttribute("data-round-reset")) {
      update(normalizeRound(new URLSearchParams()), '[data-round-shift="day"]');
    }
  };
}
