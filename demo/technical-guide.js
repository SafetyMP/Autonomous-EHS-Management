import { packetNames, packetRecord } from "./case.js";
import { roundEvidence } from "./field-round.js";

const source =
  "https://github.com/SafetyMP/Autonomous-EHS-Management/blob/57ec2fb451fd1cceb27874f9de520e0238c33905/";
export const phases = {
  source: "Field evidence",
  check: "Review gate",
  record: "Record effect",
};
export const trials = {
  packet: { label: "Your case handoff" },
  installation: {
    label: "13 Nov · Installation only",
    field:
      "Maya recorded the guard installation during a maintenance stop. The packet contains no observations from a working shift.",
    note: "Installed",
  },
  evening: {
    label: "14 Nov · Conflicting shift accounts",
    field:
      "08:10 · Day staff saw the guard in position. 20:40 · The evening operator saw it out of position at the same transfer point.",
    note: null,
  },
  revisit: {
    label: "15 Nov · Hypothetical repeat visit",
    field:
      "In this separate example the team documented a response. Operators on both shifts saw the guard in position on their repeat visits.",
    note: "Repeat visits on both shifts documented in the reviewer packet.",
  },
};

// Each note comes from an allowlisted, local fixture in the case or field round.
function noteList(entries) {
  return `<dl class="trace-notes">${entries
    .map(([label, text]) => `<div><dt>${label}</dt><dd>${text}</dd></div>`)
    .join("")}</dl>`;
}

function trialResult(fixture, abbreviated) {
  if (fixture.note === null) {
    return {
      source: fixture.field,
      check:
        "Alex holds the review because the two accounts conflict. He sends both notes back to Maya before requesting a status change.",
      record:
        "Human hold · No verification request reaches the server. Alex’s decision leaves the action available for follow-up.",
      after: "completed",
    };
  }
  const note = abbreviated ? "Seen" : fixture.note;
  const eligible = note.trim().length >= 20;
  return {
    source: fixture.field,
    check: eligible
      ? `This example assumes CAPA update permission in the action’s organization. The reviewer submits “${note}” and the permitted completed → verified change passes the note-length check.`
      : `The reviewer submits “${note}”. Verification requires at least 20 characters after trimming. The request is rejected.`,
    record: eligible
      ? "Eligible transition · The full application would save the verifier and notes on the action, add a transition, and log an audit event in the same PostgreSQL transaction."
      : "Input rejected · The application would leave the action at completed. It would write neither a new transition nor its audit event.",
    after: eligible ? "verified" : "completed",
  };
}

function conveyorTrace(selection) {
  const selected = packetRecord(selection.packet, selection.handoff);
  const title = selected.outcome?.[0] ?? "No handoff selected";
  const result =
    selection.trial === "packet"
      ? {
          source: noteList(selected.entries),
          check:
            selected.outcome?.[1] ??
            "Maya and Alex still need to review the dated observations. There is no handoff or verification request for this packet yet.",
          record:
            "The case records a routing choice only. CAPA-021 remains completed, awaiting verification. The reviewer would have to submit a separate status change to record a verification.",
          after: "completed",
        }
      : trialResult(trials[selection.trial], selection.abbreviated);
  return {
    title: "Trace the conveyor-guard packet",
    description:
      "Follow the evidence for one corrective action from the incident to the reviewer’s record.",
    summary: [
      ["Linked records", "INC-1042 → CAPA-021"],
      ["Your case packet", packetNames[selection.packet]],
      ["Your handoff", title],
    ],
    result,
  };
}

function dockTrace(round) {
  const { entries, handoff } = roundEvidence(round);
  return {
    title: "Trace the dock field round",
    description:
      "Follow the observations you collected for River Distribution’s crossing action. A handover passes work to a person who can follow it up.",
    summary: [
      ["Field assignment", "North dock · CAPA-041"],
      [
        "Current notebook",
        `${entries.length} collected ${entries.length === 1 ? "observation" : "observations"}`,
      ],
      ["Last issued handover", handoff ? handoff.title : "No handover issued"],
    ],
    result: {
      source: entries.length
        ? noteList(entries)
        : "The notebook is empty. Return to the field round and visit a stop to collect a dated observation.",
      check: handoff
        ? `<strong>At the time of issue · ${handoff.coverage}</strong><p>${handoff.body}</p>`
        : "The coordinator has not issued a handover. The crew can collect another observation or send the current packet to its next owner.",
      record: handoff
        ? `${handoff.title}. The handover records the coordinator’s instruction. CAPA-041 remains completed and awaits a human effectiveness review.`
        : "CAPA-041 remains completed. With no issued handover, the notebook supplies no instruction to the next owner.",
      after: "completed",
    },
  };
}

const componentNotes = {
  source:
    'The action record can link back to the originating incident and identify its owner. The dated observations in this demo are fictional field evidence. <a href="' +
    source +
    'src/server/db/schema.ts#L1034-L1053">Action record fields</a>',
  check:
    'People judge whether a control worked in the field. If a reviewer requests verification, the server checks their permission in the organization, the allowed change of status and the verification notes. <a href="' +
    source +
    'src/server/trpc/routers/capa.ts#L541-L620">Verification checks</a>',
  record:
    'PostgreSQL keeps the action update, the change of status and its audit event together. A later reviewer can identify who verified the action and read their notes. <a href="' +
    source +
    'src/server/trpc/routers/capa.ts#L622-L665">Transaction and audit event</a>',
};

export function renderGuide(main, selection, save, caseHref, technicalHref) {
  const dock = selection.section === "round";
  const trace = dock ? dockTrace(selection.round) : conveyorTrace(selection);
  const { phase, trial } = selection;
  const alternate = !dock && trial !== "packet";
  const panelContext = dock
    ? "Your dock round"
    : alternate
      ? "Separate trial · " + trials[trial].label
      : "Your case handoff";
  const { result } = trace;
  const writes = result.after === "verified" ? 1 : 0;
  main.innerHTML = `<article class="case-guide" aria-labelledby="trace-heading">
    <p class="case-kicker">Technical guide · ${dock ? "River Distribution" : "North plant"}</p>
    <h1 id="trace-heading">${trace.title}</h1><p>${trace.description}</p>
    <ol class="selected-stages">${trace.summary.map(([label, value]) => `<li><strong>${label}</strong><span>${value}</span></li>`).join("")}</ol>
    <section class="trial" aria-label="Interactive verification trace">
      ${
        dock
          ? ""
          : `<label for="trial-picker">Evidence trial</label><select id="trial-picker">${Object.entries(
              trials,
            )
              .map(
                ([key, fixture]) =>
                  `<option value="${key}" ${key === trial ? "selected" : ""}>${fixture.label}</option>`,
              )
              .join("")}</select>`
      }
      <div class="trial-stops" role="group" aria-label="Verification trace stops">${Object.entries(
        phases,
      )
        .map(
          ([id, label]) =>
            `<button type="button" data-phase="${id}" aria-pressed="${id === phase}">${label}</button>`,
        )
        .join("")}</div>
      ${!dock && trial === "revisit" && phase !== "source" ? `<label for="note-picker">Verification notes on the same repeat visit</label><select id="note-picker"><option value="full">Both shifts documented</option><option value="short" ${selection.abbreviated ? "selected" : ""}>Abbreviated entry · “Seen”</option></select>` : ""}
      <div class="trial-card" aria-live="polite"><h2>${panelContext}</h2><h3>${phases[phase]}</h3>
        <div>${result[phase]}</div>
        ${phase === "record" ? `<p class="model-effect"><strong>${alternate ? "Trial result" : "Case record"}</strong> <code>completed → ${result.after}</code> · ${writes} new transition ${writes === 1 ? "entry" : "entries"}. ${alternate ? "Your case action still awaits verification." : "This exercise makes no database writes."}</p>` : ""}
      </div><p>${componentNotes[phase]}</p>
    </section>
    <p><a id="trace-return">${dock ? "Return to this dock round" : "Return to this case and worksheet"}</a> · <a id="trial-permalink">Permalink to this trial and stop</a></p>
    <details><summary>Check the implementation and tests</summary><p>The <a href="${source}src/lib/workflow/capaTransitions.ts">transition table</a> separates completed work from verified effectiveness. The <a href="${source}tests/unit/workflow/capaTransitions.test.ts">workflow tests</a> exercise allowed and rejected status changes.</p></details>
  </article>`;
  main.querySelector("#trace-return").href = caseHref;
  main.querySelector("#trial-permalink").href = technicalHref;

  function update(patch, focusSelector) {
    save(patch);
    main.querySelector(focusSelector)?.focus();
  }
  main
    .querySelector("#trial-picker")
    ?.addEventListener("change", (event) =>
      update(
        { trial: event.target.value, phase: "source", abbreviated: false },
        "#trial-picker",
      ),
    );
  main
    .querySelector("#note-picker")
    ?.addEventListener("change", (event) =>
      update({ abbreviated: event.target.value === "short" }, "#note-picker"),
    );
  for (const button of main.querySelectorAll("[data-phase]")) {
    const { phase: next } = button.dataset;
    button.addEventListener("click", () =>
      update({ phase: next }, `[data-phase="${next}"]`),
    );
  }
}
