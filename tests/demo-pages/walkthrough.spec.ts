import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const consequences = {
  installation: [
    "Shift supervisor receives the evidence request",
    "Alex returns the incomplete packet",
  ],
  observation: [
    "The shift team receives a second follow-up",
    "Alex receives both records for closure review",
  ],
  evening: [
    "Maya receives both shift accounts for follow-up",
    "Alex holds closure review and returns both notes",
  ],
};

test("all six restored shift decisions follow the dated evidence", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "The guard is installed",
  );
  await expect(page.locator(".handoff-register")).toContainText("Maya Chen");
  await expect(page.locator("#case-excerpt")).toContainText(
    "same guard sitting out of position",
  );
  await expect(page.locator("#case-outcome")).not.toContainText(
    /discrepancy|different accounts|holds closure/,
  );
  for (const [index, [packet, outcomes]] of Object.entries(
    consequences,
  ).entries()) {
    await page.locator("#case-packet").selectOption(packet);
    await expect(page.locator("#case-excerpt dt")).toHaveCount(index + 1);
    for (const [i, outcome] of outcomes.entries()) {
      const action = i === 0 ? "returned" : "advanced";
      await page.locator(`[data-handoff="${action}"]`).click();
      await expect(page.locator("#case-outcome")).toContainText(outcome);
    }
  }
  await page.getByRole("button", { name: "Replay the handoff" }).click();
  await expect(page.locator("#case-outcome")).not.toContainText("Alex holds");
});

for (const width of [1440, 375]) {
  test(`selected handoff, cost sensitivity, replay and back navigation survive at ${width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("./");
    await expect(page.locator(".conveyor-drawing")).toHaveAccessibleName(
      /transfer point/,
    );
    await expect(page.locator("#case-totals")).toContainText("$12,500");
    await expect(page.locator("#case-totals")).toContainText("$9,600");
    await expect(page.locator("#case-totals")).toContainText(
      "The console costs $1,400 more",
    );
    await page.locator("#case-volume").fill("1200");
    await expect(page.locator("#case-totals")).toContainText(
      "The console costs $1,600 less",
    );
    await page.locator("#case-packet").selectOption("observation");
    await page.locator('[data-handoff="advanced"]').click();
    await page
      .getByRole("link", { name: "Trace this packet through verification" })
      .click();
    await expect(page.locator(".selected-stages")).toContainText(
      "14 Nov · 08:10",
    );
    await expect(page.locator(".selected-stages")).toContainText(
      "Alex receives both records",
    );
    await page.getByLabel("Evidence trial").selectOption("evening");
    await expect(page.locator(".trial-card")).toContainText("20:40");
    await expect(page.locator(".trial-card")).not.toContainText("Human hold");
    await page.getByRole("button", { name: "Record effect" }).click();
    await expect(page.locator(".trial-card")).toContainText("Human hold");
    const replayUrl = await page
      .getByRole("link", { name: "Permalink to this trial and stop" })
      .getAttribute("href");
    expect(replayUrl).toContain("volume=1200");
    const fresh = await context.newPage();
    await fresh.goto("./" + replayUrl);
    await expect(fresh.locator("#trial-picker")).toHaveValue("evening");
    await expect(fresh.locator(".trial-card")).toContainText("Human hold");
    await fresh
      .getByRole("link", { name: "Return to this case and worksheet" })
      .click();
    await expect(fresh.locator("#case-packet")).toHaveValue("observation");
    await expect(fresh.locator("#case-volume")).toHaveValue("1200");
    await expect(fresh.locator("#case-outcome")).toContainText(
      "Alex receives both records",
    );
    await fresh.close();
    await page.goBack();
    await expect(page.locator("#case-volume")).toHaveValue("1200");
    await expect(page.locator("#case-outcome")).toContainText(
      "Alex receives both records",
    );
    await page.locator("#case-volume").fill("");
    await expect(page.locator("#case-totals")).toContainText(
      "Complete each assumption",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("three independent technical fixtures distinguish blocked input, human hold and an eligible transaction", async ({
  page,
}) => {
  await page.goto("./#/technical?packet=installation&handoff=returned");
  await expect(page.locator(".selected-stages")).toContainText(
    "Shift supervisor receives the evidence request",
  );
  for (const [trial, gate, result] of [
    ["installation", "20 characters", "Input rejected"],
    ["evening", "Alex holds", "Human hold"],
    ["revisit", "CAPA update permission", "Eligible transition"],
  ] as const) {
    await page.locator("#trial-picker").selectOption(trial);
    await expect(page.locator(".trial-card h3")).toHaveText("Field evidence");
    await page.getByRole("button", { name: "Review gate" }).click();
    await expect(page.locator(".trial-card")).toContainText(gate);
    await page.getByRole("button", { name: "Record effect" }).click();
    await expect(page.locator(".trial-card")).toContainText(result);
    await expect(page.locator(".selected-stages")).toContainText(
      "Shift supervisor receives the evidence request",
    );
  }
  await page
    .getByLabel("Verification notes on the same repeat visit")
    .selectOption("short");
  await expect(page.locator(".trial-card")).toContainText("Input rejected");
  await expect(page.locator(".model-effect")).toContainText(
    "0 new transition entries",
  );
  await page.reload();
  await expect(page.locator("#note-picker")).toHaveValue("short");
  await page.locator("#note-picker").selectOption("full");
  await expect(page.locator(".model-effect")).toContainText(
    "1 new transition entry",
  );
  await page.getByText("Check the implementation and tests").click();
  await expect(
    page.getByRole("link", { name: "transition table" }),
  ).toHaveAttribute("href", /capaTransitions.ts$/);
});

test("old routes, malformed selectors, and keyboard skip are safe on reload", async ({
  page,
}) => {
  for (const hash of ["#/field", "#/overview", "#main"]) {
    await page.goto("./" + hash);
    await expect(
      page.getByRole("link", { name: "Conveyor case", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 }),
    ).toContainText("The guard is installed");
  }
  await page.goto(
    "./#/actions/CAPA-021?packet=constructor&phase=unknown&trial=missing",
  );
  await expect(page.locator(".selected-stages")).toContainText("20:40");
  await page.reload();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.reload();
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  ).toContainText("Trace the conveyor");
  await expect(
    page.getByRole("link", { name: "Technical workspace", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

for (const route of ["case", "technical"]) {
  test(`the ${route} has no external application requests, mobile overflow, or automated accessibility findings`, async ({
    page,
    baseURL,
  }) => {
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("./#/" + route);
    if (route === "technical")
      await page.getByRole("button", { name: "Review gate" }).click();
    else await page.locator('[data-handoff="advanced"]').click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      requests
        .filter((url) => url.startsWith("http"))
        .every((url) => url.startsWith(baseURL!)),
    ).toBe(true);
    const findings = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(findings.violations).toEqual([]);
  });
}
