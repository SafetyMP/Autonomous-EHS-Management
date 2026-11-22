/* Browser-only exercises. The record, its owner and its workflow state stay read-only. */
"use strict";

window.ehsReviewCase = (() => {
  const example = {
    installation: {
      heading: "Ask for the follow-up record",
      evidence: "The 13 November installation entry refers to a site inspection. Its excerpt gives no observation of how the guard performed in use.",
      decision: "Alex can match the installation to the near miss. Ask the shift supervisor for the observation and the operator’s account of what happened at the transfer point during work."
    },
    observation: {
      heading: "Route the packet for human review",
      evidence: "Hypothetical shift note, 14 November. The supervisor observed normal packing on line 3. The operator reported that the guard stayed in place during that run. The note covers one shift.",
      decision: "Alex can review the installation alongside a firsthand account. Do other tasks or shifts still need follow-up? The named reviewer owns that judgment and can request more evidence."
    }
  };

  let selectedPacket = "installation";
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
        <select id="case-packet"><option value="installation">Installation record only</option><option value="observation">Add a hypothetical follow-up observation</option></select>
        <p id="case-excerpt"></p></div>
        <div class="case-response" aria-live="polite"><p class="case-kicker">REVIEWER’S DECISION · ${action.reviewer}</p><h3 id="case-decision"></h3><p id="case-reason"></p></div>
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
    function updateEvidence() {
      selectedPacket = packet.value;
      const result = example[selectedPacket];
      container.querySelector("#case-excerpt").textContent = result.evidence;
      container.querySelector("#case-decision").textContent = result.heading;
      container.querySelector("#case-reason").textContent = result.decision;
      container.querySelector("#case-operator-trace").textContent = selectedPacket === "installation"
        ? "The packet still needs an account of how the guard performed."
        : "The supervisor and operator add one shift’s observation.";
    }
    packet.value = selectedPacket;
    packet.addEventListener("change", updateEvidence);
    updateEvidence();

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
      <details open><summary>Which records does the case use?</summary><p>The browser reads synthetic incident <a href="#/incidents/INC-1042">INC-1042</a> and corrective action <a href="#/actions/CAPA-021">CAPA-021</a> from the bundled fixture. The status remains “Ready for verification.” The second packet adds a hypothetical shift note only for comparison.</p></details>
      <details><summary>How are the costs calculated?</summary><p>Each option uses annual reviews × minutes per review ÷ 60 × hourly labor cost + added first-year costs. With 600 reviews at $50 per hour, 12 minutes per review produces $6,000 of console labor. Adding $5,000 yields $11,000.</p></details>
      <details><summary>How do I reproduce the checks?</summary><p>From a repository checkout with dependencies installed, run <code>npx playwright test --config playwright.demo.config.ts</code>. The suite checks both evidence packets, input changes, source navigation, mobile layout and accessibility. <a href="https://github.com/SafetyMP/Autonomous-EHS-Management/blob/main/docs/github-pages-demo.md">Read the verification guide</a>.</p></details>
      <a class="guide-workspace-link" href="#/overview">Open full corporate workspace</a>
    </article>`;
  }
  return { page, activate, guide };
})();
