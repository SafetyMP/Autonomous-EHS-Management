import {
  assumptions,
  packetNames,
  renderBrief,
  renderPacket,
  renderPilot,
} from "./case.js";
import { normalizeRound, writeRound, renderRound } from "./field-round.js";
import { phases, trials, renderGuide } from "./technical-guide.js";

const main = document.querySelector("#main");
const sections = ["brief", "round", "packet", "pilot"];
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
      value !== null &&
      (value === "" ||
        (/^-?(?:\d+|\d*\.\d+)(?:e[+-]?\d+)?$/i.test(value) &&
          Number.isFinite(Number(value))))
        ? value
        : fallback;
  }
  const technical =
    route === "/technical" ||
    ["/incidents/INC-1042", "/actions/CAPA-021"].includes(route);
  const requestedSection = params.get("section");
  let section = sections.includes(requestedSection)
    ? requestedSection
    : "brief";
  // Previous shared links predate the business brief and section selector.
  if (!sections.includes(requestedSection)) {
    if (route === "/field") section = "round";
    else if (
      technical ||
      ["packet", "handoff", "trial", "phase"].some((key) => params.has(key))
    )
      section = "packet";
    else if (Object.keys(assumptions).some((key) => params.has(key)))
      section = "pilot";
  }
  return {
    section,
    round: normalizeRound(params),
    view: technical ? "technical" : "case",
    packet: known(
      params.get("packet"),
      packetNames,
      !requestedSection && section === "packet" ? "evening" : "installation",
    ),
    handoff: ["returned", "advanced"].includes(params.get("handoff"))
      ? params.get("handoff")
      : null,
    trial: known(
      params.get("trial"),
      trials,
      !requestedSection &&
        technical &&
        (params.size > 0 || route !== "/technical")
        ? "installation"
        : "packet",
    ),
    phase: known(params.get("phase"), phases, "source"),
    abbreviated:
      params.get("trial") === "revisit" && params.get("note") === "short",
    assumptions: saved,
  };
}

function link(view, state, section = state.section) {
  const params = new URLSearchParams();
  params.set("section", section);
  writeRound(params, state.round);
  if (state.packet !== "installation") params.set("packet", state.packet);
  if (state.handoff) params.set("handoff", state.handoff);
  if (state.trial !== "packet") params.set("trial", state.trial);
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
function traceSection() {
  return selection.section === "brief" ? "packet" : selection.section;
}
function updateLinks() {
  for (const a of document.querySelectorAll("[data-section]"))
    a.href = link("case", selection, a.dataset.section);
  for (const a of document.querySelectorAll("[data-trace-link]"))
    a.href = link("technical", selection, traceSection());
  for (const a of document.querySelectorAll("[data-round-trace]"))
    a.href = link("technical", selection, "round");
  for (const a of document.querySelectorAll("header nav a")) {
    if ((selection.view === "technical") === a.hasAttribute("data-trace-link"))
      a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
}
function save(patch) {
  Object.assign(selection, patch);
  history.replaceState(null, "", link(selection.view, selection));
  updateLinks();
}
function technical() {
  renderGuide(
    main,
    selection,
    (patch) => {
      save(patch);
      technical();
    },
    link("case", selection, traceSection()),
    link("technical", selection, traceSection()),
  );
}
function show() {
  selection = readLocation();
  if (selection.view === "technical") technical();
  else if (selection.section === "packet")
    renderPacket(main, selection, (patch) => {
      if (
        selection.packet !== patch.packet ||
        selection.handoff !== patch.handoff
      ) {
        Object.assign(patch, {
          trial: "packet",
          phase: "source",
          abbreviated: false,
        });
      }
      save(patch);
    });
  else if (selection.section === "pilot") renderPilot(main, selection, save);
  else if (selection.section === "round") {
    main.innerHTML = `<article class="field-assignment"><header class="round-intro"><p class="case-kicker">Field assignment · River Distribution · CAPA-041</p><h1>Walk the dock across two shifts</h1><p>A pedestrian and a lift truck shared an aisle. The site marked a crossing and changed where pallets are staged. Collect a crew’s account at the stops you visit, then compare what the next shift sees.</p></header><div id="round"></div><section class="return-plant"><div><h2>Back at North plant</h2><p>Maya has an installation log and two shift accounts about a conveyor guard. Use what you learned about coverage to decide where her separate action should go.</p></div><a class="work-link" data-section="packet" href="#/case?section=packet">Review Maya’s conveyor file</a></section></article>`;
    renderRound(
      main.querySelector("#round"),
      selection.round,
      (round) => save({ round }),
      link("technical", selection, "round"),
    );
  } else renderBrief(main);
  updateLinks();
}
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  main.focus();
});
show();
addEventListener("hashchange", () => {
  show();
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
});
