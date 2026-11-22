/* Browser-only exercises. The record, its owner and its workflow state stay read-only. */
"use strict";

window.ehsReviewCase = (() => {
  // The installation entry summarizes the bundled fixture. Both shift notes are fictional case evidence.
  const notes = [
    ["13 Nov · Installation log", "Maya Chen logged the guard installation at conveyor 3. The entry references a site inspection."],
    ["14 Nov 08:10 · Day operator", "“The guard was in position at the transfer point when our packing run ended.”"],
    ["14 Nov 20:40 · Evening operator", "“At run end I saw the same guard sitting out of position.”"]
  ];
  const example = {
    installation: {
      count: 1, shifts: "No shift notes attached.",
      returned: ["Shift supervisor receives the evidence request", "The log documents installation. Maya asks the shift team to supply a dated account of the guard during work before handing the case to Alex."],
      advanced: ["Alex returns the incomplete packet", "Alex finds the installation entry but no account from a working shift. The packet goes back to Maya for another handoff."]
    },
    observation: {
      count: 2, shifts: "Day operator · 08:10.",
      returned: ["The shift team receives a second follow-up", "The day operator has already reported on one run. Asking for another shift’s account adds a handoff and can reveal conditions that the day shift did not observe."],
      advanced: ["Alex receives both records for closure review", "Alex can assess the installation and the day operator’s account together. One run supports that time window. Alex still decides whether other shifts need review before signing."]
    },
    evening: {
      count: 3, shifts: "Day operator · 08:10. Evening operator · 20:40.",
      returned: ["Maya receives both shift accounts for follow-up", "The operators give different accounts of the same guard. Maya keeps both notes with the action and asks the shift supervisors to establish what changed between the two observations. Alex has no signed closure to record."],
      advanced: ["Alex holds closure review and returns both notes", "Passing on a longer packet did not resolve the discrepancy. The day note cannot establish the guard’s condition at 20:40. Alex sends the two accounts back to Maya, adding a review round."]
    }
  };

  let selectedPacket = "evening";
  let selectedAction = null;
  const worksheetValues = new Map();

  function page(action) {
    return `<article class="case-study">
      <header class="case-lead">
        <div class="handoff-bar"><span>Shift handoff</span><span>North plant · Packaging line 3</span></div>
        <h1>The guard is installed. Is the action ready to close?</h1>
        <dl class="handoff-register">
          <div><dt>Near miss</dt><dd><a href="#/incidents/${action.incident}" aria-label="Read incident ${action.incident}">${action.incident}</a></dd></div>
          <div><dt>Corrective action</dt><dd><a href="#/actions/${action.id}" aria-label="Inspect ${action.id}">${action.id}</a></dd></div>
          <div><dt>Installation recorded by</dt><dd>${action.owner}</dd></div>
          <div><dt>Closure reviewer</dt><dd>${action.reviewer}</dd></div>
        </dl>
      </header>
      <section class="case-evidence" aria-labelledby="packet-heading">
        <div><h2 id="packet-heading">Evidence at handoff</h2>
        <label for="case-packet">Evidence available to ${action.reviewer}</label>
        <select id="case-packet"><option value="installation">Packet through 13 November</option><option value="observation">Packet through 14 November, 08:10</option><option value="evening">Packet through 14 November, 20:40</option></select>
        <dl id="case-excerpt" aria-label="Illustrative record excerpts"></dl></div>
        <div class="case-response"><p class="case-kicker">YOUR SHIFT HANDOFF</p><h3 id="case-decision">Who should receive the packet next?</h3>
          <div class="handoff-actions"><button type="button" data-handoff="returned">Return for evidence</button><button type="button" data-handoff="advanced">Send to ${action.reviewer}</button></div>
          <div id="case-outcome" aria-live="polite"></div><button type="button" id="case-replay" hidden>Replay the handoff</button>
        </div>
      </section>
      <section class="case-figures" aria-label="Conveyor and review diagrams">
        <figure class="conveyor-context">
          <figcaption><strong>Where the near miss occurred</strong><span>Conveyor 3 · conceptual view</span></figcaption>
          <div class="conveyor-drawing" role="img" aria-label="Two conveyor sections meet at a transfer point. The action record identifies a guard at that point.">
            <span class="guard-callout">Guard at transfer point</span><i class="transfer-guard"></i><i class="conveyor-box"></i><i class="conveyor-bed feed"></i><i class="conveyor-bed discharge"></i>
          </div>
          <p>The report identified the transfer point. The drawing locates the action item.</p>
        </figure>
        <figure class="review-trace">
          <figcaption><strong>How the packet reaches the reviewer</strong><span>Trace the selected evidence</span></figcaption>
          <ol>
            <li><b>Action owner</b><span>${action.owner} links the installation record.</span></li>
            <li><b>Shift team</b><span id="case-operator-trace"></span></li>
            <li><b>Closure reviewer</b><span>${action.reviewer} weighs the packet and requests follow-up as needed.</span></li>
          </ol>
        </figure>
      </section>
      <section class="case-model" aria-labelledby="model-heading">
        <p class="case-kicker">EHS DIRECTOR’S WORKSHEET</p><h2 id="model-heading">What would justify a self-hosted pilot?</h2>
        <p>Consider three ways to assemble the same evidence. Keep the current email handoff, standardize the existing tracker or link records in the EHS console. Compare the staff time spent finding evidence, matching it to the right action and chasing missing records.</p>
        <fieldset><legend>Illustrative first-year assumptions</legend>
          <div class="case-inputs">
            <label>Actions reviewed per year<input type="number" id="case-volume" min="0" max="1000000" step="1" required value="600"></label>
            <label>Loaded labor cost ($/hour)<input type="number" id="case-rate" min="0" max="10000" step="any" required value="50"></label>
          </div>
          <div class="case-options">
            <div><h3>Current email handoff</h3><label>Minutes per action, email<input id="case-email-time" type="number" min="0" max="10000" step="any" required value="25"></label><p>Existing systems form the baseline.</p></div>
            <div><h3>Standardized tracker</h3><label>Minutes per action, tracker<input id="case-tracker-time" type="number" min="0" max="10000" step="any" required value="18"></label><label>Added year-one cost, tracker ($)<input id="case-tracker-cost" type="number" min="0" max="1000000000" step="any" required value="600"></label></div>
            <div><h3>Self-hosted console</h3><label>Minutes per action, console<input id="case-console-time" type="number" min="0" max="10000" step="any" required value="12"></label><label>Added year-one cost, console ($)<input id="case-console-cost" type="number" min="0" max="1000000000" step="any" required value="5000"></label></div>
          </div>
        </fieldset>
        <p>Include setup, training, hosting and support in added costs. Each option assumes the same number of reviews and the same field verification effort.</p>
        <div id="case-totals" class="case-totals" role="status"></div>
        <p>Year-one cost = actions × minutes per action ÷ 60 × loaded hourly cost + added cost. Labor time represents capacity. Injury avoidance and cash savings are outside this estimate.</p>
      </section>
      <section class="case-pilot"><h2>Who decides after the North plant pilot?</h2><p>The plant manager authorizes pilot funding and paid time for operators and shift supervisors to participate. The EHS director owns the evaluation. Have the site coordinator compare handling minutes and the share of packets returned for missing evidence for similar cases in email, the tracker and the console. Count exception handling and support time.</p>
        <p>Ask workers and reviewers which observations each workflow lost at handoff. The director takes the plant manager a cost comparison, a count of late reviews and a sample of packets with operator feedback. Fund expansion only if the extra time recovered covers the extra cost and the pilot preserves field evidence. Keep the tracker if it meets the same standard at lower cost.</p>
        <p>OSHA recommends checking whether installed controls work and involving workers in that assessment. Its program-evaluation guidance identifies timely corrective action as a leading indicator. The worksheet inputs are fictional local planning assumptions.</p>
        <div class="case-source-links"><a href="https://www.osha.gov/safety-management/hazard-prevention">OSHA · Hazard prevention and control</a><a href="https://www.osha.gov/safety-management/program-evaluation">OSHA · Program evaluation</a><a href="https://www.osha.gov/safety-management/management-leadership">OSHA · Management leadership</a><a href="https://www.osha.gov/safety-management/worker-participation">OSHA · Worker participation</a></div>
      </section>
    </article>`;
  }

  function activate(container) {
    const packet = container.querySelector("#case-packet");
    const outcome = container.querySelector("#case-outcome");
    const replay = container.querySelector("#case-replay");
    const buttons = container.querySelectorAll("[data-handoff]");
    function showDecision() {
      const record = example[selectedPacket];
      for (const button of buttons) button.setAttribute("aria-pressed", String(selectedAction === button.dataset.handoff));
      replay.hidden = !selectedAction;
      if (!selectedAction) {
        outcome.textContent = "As shift coordinator, choose the packet’s next stop. Alex owns the final closure decision.";
        return;
      }
      const [title, consequence] = record[selectedAction];
      outcome.innerHTML = `<strong>${title}</strong><p>${consequence}</p><small>Modeled handoff · CAPA-021 stays “Ready for verification” in the source record.</small>`;
    }

    function showPacket() {
      packet.value = selectedPacket;
      const record = example[selectedPacket];
      container.querySelector("#case-excerpt").innerHTML = notes.slice(0, record.count)
        .map(([source, excerpt]) => `<div><dt>${source}</dt><dd>${excerpt}</dd></div>`).join("");
      container.querySelector("#case-operator-trace").textContent = record.shifts;
      showDecision();
    }
    packet.addEventListener("change", () => {
      selectedPacket = packet.value;
      selectedAction = null;
      showPacket();
    });
    for (const button of buttons) button.addEventListener("click", () => {
      selectedAction = button.dataset.handoff;
      showDecision();
    });
    replay.addEventListener("click", () => {
      selectedPacket = "evening";
      selectedAction = null;
      showPacket();
      packet.focus();
    });
    showPacket();

    const model = container.querySelector(".case-model");
    const totals = model.querySelector("#case-totals");
    const inputs = [...model.querySelectorAll("input")];
    for (const input of inputs) {
      if (worksheetValues.has(input.id)) input.value = worksheetValues.get(input.id);
    }
    const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    function updateCosts() {
      for (const input of inputs) worksheetValues.set(input.id, input.value);
      if (inputs.some((input) => !input.validity.valid)) {
        totals.textContent = "Complete each assumption with a value within its range to compare year-one costs.";
        return;
      }
      const read = (id) => model.querySelector(`#case-${id}`).valueAsNumber;
      const costPerMinute = read("volume") * read("rate") / 60;
      const email = costPerMinute * read("email-time");
      const tracker = costPerMinute * read("tracker-time") + read("tracker-cost");
      const consoleCost = costPerMinute * read("console-time") + read("console-cost");
      const difference = consoleCost - tracker;
      const costs = [["Email handoff", email], ["Tracker", tracker], ["Console", consoleCost]];
      const maximum = Math.max(...costs.map(([, value]) => value), 1);
      totals.innerHTML = `<figure class="cost-graphic"><figcaption><strong>Modeled year-one costs</strong><span>USD · common scale from zero</span></figcaption>
        <dl>${costs.map(([label, value]) => `<div><dt>${label}</dt><dd><span class="cost-track" aria-hidden="true"><i style="width:${100 * value / maximum}%"></i></span><b>${currency.format(value)}</b></dd></div>`).join("")}</dl></figure>
        <p>${Math.abs(difference) < 0.5 ? "The console and tracker cost the same to the nearest dollar." : `The console costs ${currency.format(Math.abs(difference))} ${difference > 0 ? "more" : "less"} than the tracker in year one.`}</p>`;
    }
    model.addEventListener("input", updateCosts);
    updateCosts();
  }
  function guide() {
    return `<article class="case-guide"><p class="case-kicker">AUTONOMOUS EHS · TECHNICAL WORKSPACE</p>
      <h1>Verify the conveyor case</h1>
      <p>Trace the evidence behind the shift handoff, check the arithmetic or open the corporate walkthrough.</p>
      <details open><summary>Which records does the case use?</summary><p>The browser reads synthetic incident <a href="#/incidents/INC-1042">INC-1042</a> and corrective action <a href="#/actions/CAPA-021">CAPA-021</a> from the bundled fixture. The status remains “Ready for verification.” The three cutoffs add hypothetical day and evening operator notes to the installation summary. Times and quotations belong to the browser exercise.</p></details>
      <details><summary>How are the costs calculated?</summary><p>Each option uses annual reviews × minutes per review ÷ 60 × hourly labor cost + added first-year costs. With 600 reviews at $50 per hour, 12 minutes per review produces $6,000 of console labor. Adding $5,000 yields $11,000.</p></details>
      <details><summary>How do I reproduce the checks?</summary><p>From a repository checkout with dependencies installed, run <code>npx playwright test --config playwright.demo.config.ts</code>. The suite checks all three packets and six handoffs, input changes, source navigation, mobile layout and accessibility. <a href="https://github.com/SafetyMP/Autonomous-EHS-Management/blob/main/docs/github-pages-demo.md">Read the verification guide</a>.</p></details>
      <a class="guide-workspace-link" href="#/overview">Open full corporate workspace</a>
    </article>`;
  }
  return { page, activate, guide };
})();
