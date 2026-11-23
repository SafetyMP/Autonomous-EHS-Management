// The installation entry summarizes the bundled fixture. Both shift notes are fictional case evidence.
const notes = [
  [
    "13 Nov · Installation log",
    "Maya Chen logged the guard installation at conveyor 3. The entry references a site inspection.",
  ],
  [
    "14 Nov 08:10 · Day operator",
    "“The guard was in position at the transfer point when our packing run ended.”",
  ],
  [
    "14 Nov 20:40 · Evening operator",
    "“At run end I saw the same guard sitting out of position.”",
  ],
];
const example = {
  installation: {
    count: 1,
    shifts: "No shift notes attached.",
    returned: [
      "Shift supervisor receives the evidence request",
      "The log documents installation. Maya asks the shift team to supply a dated account of the guard during work before handing the case to Alex.",
    ],
    advanced: [
      "Alex returns the incomplete packet",
      "Alex finds the installation entry but no account from a working shift. The packet goes back to Maya for another handoff.",
    ],
  },
  observation: {
    count: 2,
    shifts: "Day operator · 08:10.",
    returned: [
      "The shift team receives a second follow-up",
      "The day operator has already reported on one run. Asking for another shift’s account adds a handoff and can reveal conditions that the day shift did not observe.",
    ],
    advanced: [
      "Alex receives both records for closure review",
      "Alex can assess the installation and the day operator’s account together. One run supports that time window. Alex still decides whether other shifts need review before signing.",
    ],
  },
  evening: {
    count: 3,
    shifts: "Day operator · 08:10. Evening operator · 20:40.",
    returned: [
      "Maya receives both shift accounts for follow-up",
      "The operators give different accounts of the same guard. The shift supervisor handles the reported condition under site procedures. Maya keeps both accounts with the open action so Alex can follow up.",
    ],
    advanced: [
      "Alex holds closure review and returns both notes",
      "Passing on a longer packet did not resolve the discrepancy. The day note cannot establish the guard’s condition at 20:40. The shift supervisor handles the reported condition under site procedures. Alex sends both notes back to Maya for follow-up, adding a review round.",
    ],
  },
};

export const action = {
  id: "CAPA-021",
  incident: "INC-1042",
  owner: "Maya Chen",
  reviewer: "Alex Morgan",
};
export const packetNames = {
  installation: "13 Nov · Installation",
  observation: "14 Nov · 08:10",
  evening: "14 Nov · 20:40",
};
export function packetRecord(packet, handoff) {
  const record = example[packet];
  return {
    entries: notes.slice(0, record.count),
    outcome: handoff ? record[handoff] : null,
  };
}
export const assumptions = {
  volume: "600",
  rate: "50",
  "email-time": "25",
  "tracker-time": "18",
  "tracker-cost": "600",
  "console-time": "12",
  "console-cost": "5000",
};

export function renderBrief(container) {
  container.innerHTML = `<article class="shift-brief">
    <header class="shift-hero">
      <div><p class="case-kicker">Corporate environment, health &amp; safety · Shift briefing</p>
        <h1>What happens to a safety fix after the shift changes?</h1>
        <p>At North plant, two crews pack orders on the same conveyor. After a near miss, maintenance installs a guard where cartons pass from one belt to the next. The work order is marked complete. Maya Chen, the action owner, still needs to tell the EHS reviewer how the guard performs during a working shift.</p>
      </div>
      <figure class="brief-figure"><figcaption>North plant · Packaging line 3</figcaption>
        <div class="conveyor-drawing" role="img" aria-label="Two conveyor sections meet at a transfer point, the location of the reported near miss."><span class="guard-callout">Guard at transfer point</span><i class="transfer-guard"></i><i class="conveyor-box"></i><i class="conveyor-bed feed"></i><i class="conveyor-bed discharge"></i></div>
        <p>Near miss INC-1042 <span aria-hidden="true">→</span> Corrective action CAPA-021</p>
      </figure>
    </header>
    <section class="shift-problem"><h2>One repair, three accounts</h2>
      <p>Maintenance knows what it installed. Operators see what happens as work changes. The EHS reviewer, Alex Morgan, receives the paperwork later. When the installation log, shift notes and email replies travel separately, Alex can’t tell which conditions anyone checked. Maya spends another shift finding the right operator, while a question about the original hazard stays open.</p>
      <h2>How Autonomous EHS keeps the follow-up together</h2>
      <ol class="method-strip">
        <li><strong>Link the work</strong><span>A near-miss report leads to a corrective action with a named owner. Both records point to the same problem.</span></li>
        <li><strong>Gather observations</strong><span>The owner brings dated accounts from the people doing the work to the reviewer. A missing shift or a conflicting note becomes a specific follow-up.</span></li>
        <li><strong>Record the human decision</strong><span>An authorized reviewer can verify the action with notes. The system records the change and its audit history together.</span></li>
      </ol>
    </section>
    <section class="field-invite"><div><p class="case-kicker">Field assignment · River Distribution</p>
      <h2>Try gathering the evidence yourself</h2>
      <p>Before opening Maya’s conveyor file, join the same EHS review exercise at a second site. After a near miss, the dock team marked a pedestrian crossing and changed where pallets are staged. You have 20 minutes per round. Where you go and which shift you visit determine what you can hand to the next person.</p></div>
      <div><a class="work-link" data-section="round" href="#/case?section=round">Walk the dock</a><a data-section="packet" href="#/case?section=packet">Open Maya’s conveyor file</a></div>
    </section></article>`;
}

function packetPage(action) {
  return `<article class="case-study">
      <header class="case-lead">
        <div class="handoff-bar"><span>Conveyor file · North plant</span><span>Packaging line 3</span></div>
        <h1>What can Alex verify about conveyor 3?</h1>
        <p>The dock round shows why the time and place of an observation matter. Here Maya has a separate action. Read the dated record, decide who needs it next, then move the cutoff to see what another shift adds.</p>
        <dl class="handoff-register">
          <div><dt>Near miss</dt><dd>${action.incident}</dd></div><div><dt>Corrective action</dt><dd>${action.id}</dd></div>
          <div><dt>Action owner</dt><dd>${action.owner}</dd></div><div><dt>Reviewer</dt><dd>${action.reviewer}</dd></div>
        </dl></header>
      <section class="case-evidence" aria-labelledby="packet-heading">
        <div><h2 id="packet-heading">Evidence at handoff</h2>
        <label for="case-packet">Evidence available to ${action.reviewer}</label>
        <select id="case-packet"><option value="installation">Packet through 13 November</option><option value="observation">Packet through 14 November, 08:10</option><option value="evening">Packet through 14 November, 20:40</option></select>
        <dl id="case-excerpt" aria-label="Illustrative record excerpts"></dl></div>
        <div class="case-response"><p class="case-kicker">YOUR SHIFT HANDOFF</p><h3 id="case-decision">Who should receive the packet next?</h3>
          <div class="handoff-actions"><button type="button" data-handoff="returned">Return for evidence</button><button type="button" data-handoff="advanced">Send to ${action.reviewer}</button></div>
          <div id="case-outcome" aria-live="polite"></div><button type="button" id="case-replay" hidden>Replay the handoff</button>
        </div>
        <p class="trace-entry"><a data-trace-link href="#/technical">Trace this packet through verification →</a></p>
      </section>
      <p class="case-next"><a data-section="round" href="#/case?section=round">Revisit the dock round</a><a class="work-link" data-section="pilot" href="#/case?section=pilot">Compare the pilot costs</a></p>
    </article>`;
}
function pilotPage() {
  return `<article class="case-study">
      <section class="case-model" aria-labelledby="model-heading">
        <p class="case-kicker">EHS DIRECTOR’S WORKSHEET</p><h1 id="model-heading">What would justify a self-hosted pilot?</h1>
        <p>Consider three ways to assemble the same evidence. Keep the current email handoff, standardize the existing tracker or link records in the EHS console. Compare the staff time spent finding evidence, matching it to the right action and chasing missing records.</p>
        <p class="pilot-volumes"><strong>Try an annual workload</strong> <button type="button" data-volume="600">600 reviews</button> <button type="button" data-volume="1200">1,200 reviews</button></p>
        <details class="pilot-inputs"><summary>Adjust the planning assumptions</summary><fieldset><legend>Illustrative first-year assumptions</legend>
          <div class="case-inputs">
            <label>Actions reviewed per year<input type="number" id="case-volume" min="0" max="1000000" step="1" required value="600"></label>
            <label>Loaded labor cost ($/hour)<input type="number" id="case-rate" min="0" max="10000" step="any" required value="50"></label>
          </div>
          <div class="case-options">
            <div><h3>Current email handoff</h3><label>Minutes per action, email<input id="case-email-time" type="number" min="0" max="10000" step="any" required value="25"></label><p>Existing systems form the baseline.</p></div>
            <div><h3>Standardized tracker</h3><label>Minutes per action, tracker<input id="case-tracker-time" type="number" min="0" max="10000" step="any" required value="18"></label><label>Added year-one cost, tracker ($)<input id="case-tracker-cost" type="number" min="0" max="1000000000" step="any" required value="600"></label></div>
            <div><h3>Self-hosted console</h3><label>Minutes per action, console<input id="case-console-time" type="number" min="0" max="10000" step="any" required value="12"></label><label>Added year-one cost, console ($)<input id="case-console-cost" type="number" min="0" max="1000000000" step="any" required value="5000"></label></div>
          </div>
        </fieldset></details>
        <p>Include setup, training, hosting and support in added costs. Each option assumes the same number of reviews and the same field verification effort.</p>
        <div id="case-totals" class="case-totals" role="status"></div>
        <p>Year-one cost = actions × minutes per action ÷ 60 × loaded hourly cost + added cost. Labor time represents capacity. Injury avoidance and cash savings are outside this estimate.</p>
      </section>
      <section class="case-pilot"><h2>Who decides after the North plant pilot?</h2><p>The plant manager authorizes pilot funding and paid time for operators and shift supervisors to participate. The EHS director owns the evaluation. Have the site coordinator compare handling minutes and the share of packets returned for missing evidence for similar cases in email, the tracker and the console. Count exception handling and support time.</p>
        <p>Ask workers and reviewers which observations each workflow lost at handoff. The director takes the plant manager a cost comparison, a count of late reviews and a sample of packets with operator feedback. Fund expansion only if the extra time recovered covers the extra cost and the pilot preserves field evidence. Keep the tracker if it meets the same standard at lower cost.</p>
        <p>OSHA recommends checking whether installed controls work and involving workers in that assessment. Its program-evaluation guidance identifies timely corrective action as a leading indicator. The worksheet inputs are fictional local planning assumptions.</p>
        <p><a data-section="packet" href="#/case?section=packet">Return to Maya’s conveyor file</a></p>
        <div class="case-source-links"><a href="https://www.osha.gov/safety-management/hazard-prevention">OSHA · Checking control effectiveness with workers</a><a href="https://www.govinfo.gov/content/pkg/GOVPUB-L35-PURL-gpo142334/pdf/GOVPUB-L35-PURL-gpo142334.pdf">OSHA 3885 · Control effectiveness, worker participation and program evaluation (PDF)</a></div>
      </section>
    </article>`;
}

export function renderPacket(container, selection, onChange) {
  container.innerHTML = packetPage(action);
  let selectedPacket = selection.packet;
  let selectedAction = selection.handoff;

  const publish = () =>
    onChange({
      packet: selectedPacket,
      handoff: selectedAction,
    });
  const packet = container.querySelector("#case-packet");
  const outcome = container.querySelector("#case-outcome");
  const replay = container.querySelector("#case-replay");
  const buttons = container.querySelectorAll("[data-handoff]");
  function showDecision() {
    const record = example[selectedPacket];
    for (const button of buttons)
      button.setAttribute(
        "aria-pressed",
        String(selectedAction === button.dataset.handoff),
      );
    replay.hidden = !selectedAction;
    publish();
    if (!selectedAction) {
      outcome.textContent =
        "As shift coordinator, choose the packet’s next stop. Alex owns the final closure decision.";
      return;
    }
    const [title, consequence] = record[selectedAction];
    outcome.innerHTML = `<strong>${title}</strong><p>${consequence}</p><small>Modeled handoff · CAPA-021 stays “Ready for verification” in the source record.</small>`;
  }

  function showPacket() {
    packet.value = selectedPacket;
    const record = example[selectedPacket];
    container.querySelector("#case-excerpt").innerHTML = notes
      .slice(0, record.count)
      .map(
        ([source, excerpt]) =>
          `<div><dt>${source}</dt><dd>${excerpt}</dd></div>`,
      )
      .join("");

    showDecision();
  }
  packet.addEventListener("change", () => {
    selectedPacket = packet.value;
    selectedAction = null;
    showPacket();
  });
  for (const button of buttons)
    button.addEventListener("click", () => {
      selectedAction = button.dataset.handoff;
      showDecision();
    });
  replay.addEventListener("click", () => {
    selectedPacket = "installation";
    selectedAction = null;
    showPacket();
    packet.focus();
  });
  showPacket();
}

export function renderPilot(container, selection, onChange) {
  container.innerHTML = pilotPage();
  const worksheetValues = new Map(Object.entries(selection.assumptions));
  const publish = () =>
    onChange({ assumptions: Object.fromEntries(worksheetValues) });
  const model = container.querySelector(".case-model");
  for (const button of model.querySelectorAll("[data-volume]")) {
    button.addEventListener("click", () => {
      model.querySelector("#case-volume").value = button.dataset.volume;
      updateCosts();
    });
  }
  const totals = model.querySelector("#case-totals");
  const inputs = [...model.querySelectorAll("input")];
  for (const input of inputs) {
    if (worksheetValues.has(input.id.slice(5)))
      input.value = worksheetValues.get(input.id.slice(5));
  }
  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  function updateCosts() {
    for (const input of inputs)
      worksheetValues.set(input.id.slice(5), input.value);
    publish();
    if (inputs.some((input) => !input.validity.valid)) {
      totals.textContent =
        "Complete each assumption with a value within its range to compare year-one costs.";
      return;
    }
    const read = (id) => model.querySelector(`#case-${id}`).valueAsNumber;
    const costPerMinute = (read("volume") * read("rate")) / 60;
    const email = costPerMinute * read("email-time");
    const tracker = costPerMinute * read("tracker-time") + read("tracker-cost");
    const consoleCost =
      costPerMinute * read("console-time") + read("console-cost");
    const difference = consoleCost - tracker;
    const costs = [
      ["Email handoff", email],
      ["Tracker", tracker],
      ["Console", consoleCost],
    ];
    const maximum = Math.max(...costs.map(([, value]) => value), 1);
    totals.innerHTML = `<figure class="cost-graphic"><figcaption><strong>Modeled year-one costs</strong><span>USD · common scale from zero</span></figcaption>
        <dl>${costs.map(([label, value]) => `<div><dt>${label}</dt><dd><span class="cost-track" aria-hidden="true"><i style="width:${(100 * value) / maximum}%"></i></span><b>${currency.format(value)}</b></dd></div>`).join("")}</dl></figure>
        <p>${Math.abs(difference) < 0.5 ? "The console and tracker cost the same to the nearest dollar." : `The console costs ${currency.format(Math.abs(difference))} ${difference > 0 ? "more" : "less"} than the tracker in year one.`}</p>`;
  }
  model.addEventListener("input", updateCosts);
  updateCosts();
}
