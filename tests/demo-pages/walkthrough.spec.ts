import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const incidentTitle = "Unguarded transfer point at conveyor 3";
const actionTitle = "Install fixed guarding at conveyor 3";
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
});
test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page), "Browser runtime and failed-request errors").toEqual([]);
});

async function openDemo(page: Page, hash = "/overview") {
  await page.goto(`./#${hash}`);
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
}

async function expectSyntheticLabel(page: Page) {
  const banner = page.locator(".demo-banner:visible, .case-notice:visible");
  await expect(banner).toContainText(/synthetic/i);
  await expect(banner).toContainText(/read only/i);
}

test("loads relative assets beneath the deployment path and reloads a direct record link", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("The walkthrough requires a configured base URL");
  const deployment = new URL(baseURL);
  const failedResources: string[] = [];
  const localAssets = new Set<string>();
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin !== deployment.origin) return;
    if (response.status() >= 400) failedResources.push(`${response.status()} ${url.pathname}`);
    if (/\.(css|js)$/.test(url.pathname) && response.ok()) localAssets.add(url.pathname);
  });
  await openDemo(page, "/incidents/INC-1042");
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toContainText(incidentTitle);
  expect(new URL(page.url()).pathname).toBe(deployment.pathname);
  expect(localAssets.has(new URL("styles.css", deployment).pathname)).toBe(true);
  expect(localAssets.has(new URL("app.js", deployment).pathname)).toBe(true);
  await page.reload();
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toContainText(incidentTitle);
  await expectSyntheticLabel(page);
  expect(failedResources).toEqual([]);
});

test("follows a synthetic incident to its corrective action and back to its source", async ({ page }) => {
  await openDemo(page);
  const main = page.getByRole("main");
  await main.locator('a[href="#/incidents/INC-1042"]').first().click();
  await expect(page).toHaveURL((url) => url.hash === "#/incidents/INC-1042");
  await expect(main.getByRole("heading", { level: 1 })).toContainText(incidentTitle);
  await main.getByRole("link", { name: actionTitle, exact: true }).click();
  await expect(page).toHaveURL((url) => url.hash === "#/actions/CAPA-021");
  await expect(main.getByRole("heading", { level: 1 })).toContainText(actionTitle);
  await main.getByRole("link", { name: incidentTitle, exact: true }).click();
  await expect(page).toHaveURL((url) => url.hash === "#/incidents/INC-1042");
  await expect(main.getByRole("heading", { level: 1 })).toContainText(incidentTitle);
  await expectSyntheticLabel(page);
});

test("navigation search finds the work area and clears without losing destinations", async ({ page }) => {
  await openDemo(page);
  const nav = page.getByRole("complementary", { name: "Workspace navigation", exact: true });
  const search = nav.getByRole("searchbox", { name: "Find a workspace", exact: true });
  await search.fill("reports");
  const reports = nav.locator('a[href="#/reports"]');
  await expect(reports).toBeVisible();
  await expect(nav.locator('a[href="#/incidents"]')).not.toBeVisible();
  await reports.click();
  await expect(page).toHaveURL((url) => url.hash === "#/reports");
  await expect(page.locator("#current-area")).toHaveText("Reports & evidence");
  await search.fill("no-such-workspace");
  await expect(nav).toContainText(/no .*match|no .*found/i);
  await search.fill("");
  await expect(nav.locator('a[href="#/incidents"]')).toBeVisible();
});

test("incident search and status survive the corrective-action source round trip", async ({ page }) => {
  await openDemo(page, "/incidents");
  const main = page.getByRole("main");
  const search = main.getByRole("searchbox", { name: "Search incidents", exact: true });
  const status = main.getByRole("combobox", { name: "Status", exact: true });
  await search.fill("conveyor 3");
  await status.selectOption("Under review");
  await expect(main.locator("tbody tr")).toHaveCount(1);
  await main.getByRole("link", { name: incidentTitle, exact: true }).click();
  await main.getByRole("link", { name: actionTitle, exact: true }).click();
  await main.getByRole("link", { name: "Return to source incident", exact: true }).click();
  await main.getByRole("link", { name: "Back to incidents", exact: true }).click();
  await expect(search).toHaveValue("conveyor 3");
  await expect(status).toHaveValue("Under review");
  await expect(main.locator("tbody tr")).toHaveCount(1);
  await expect(main.getByRole("link", { name: incidentTitle, exact: true })).toBeVisible();
  await search.fill("no such sample record");
  await expect(main.getByRole("heading", { name: "No matching sample incidents", exact: true })).toBeVisible();
});

test("the synthetic site selector scopes records and can return to all sample sites", async ({ page }) => {
  await openDemo(page, "/incidents");
  const scope = page.getByRole("combobox", { name: "Sample site scope", exact: true });
  await scope.selectOption("North plant");
  await expect(scope).toHaveValue("North plant");
  await expect(page.getByRole("main").getByRole("link", { name: incidentTitle, exact: true })).toBeVisible();
  await scope.selectOption("River distribution");
  await expect(page.getByRole("main").getByRole("link", { name: incidentTitle, exact: true })).toHaveCount(0);
  await scope.selectOption("all");
  await expect(page.getByRole("main").getByRole("link", { name: incidentTitle, exact: true })).toBeVisible();
  await expectSyntheticLabel(page);
});

test("exploration uses only deployment assets, without APIs or transmitted fixture records", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("The walkthrough requires a configured base URL");
  const deploymentOrigin = new URL(baseURL).origin;
  const externalRequests: string[] = [];
  const apiRequests: string[] = [];
  const webSockets: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== deploymentOrigin) externalRequests.push(request.url());
    if (["fetch", "xhr"].includes(request.resourceType()) || request.method() !== "GET") {
      apiRequests.push(`${request.method()} ${request.url()}`);
    }
  });
  page.on("websocket", (socket) => webSockets.push(socket.url()));
  for (const route of [
    "/case", "/overview", "/incidents", "/incidents/INC-1042", "/actions", "/actions/CAPA-021",
    "/audits", "/programs", "/reports", "/about",
  ]) {
    await openDemo(page, route);
    await expectSyntheticLabel(page);
  }
  expect(externalRequests).toEqual([]);
  expect(apiRequests).toEqual([]);
  expect(webSockets).toEqual([]);
});

test("mobile navigation traps keyboard focus, restores the opener, and closes on navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page);
  const opener = page.getByRole("button", { name: "Open workspace menu", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Your workspace", exact: true });
  const close = dialog.getByRole("button", { name: "Close workspace menu", exact: true });
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  const lastControl = dialog.locator('button:visible, input:visible, a[href]:visible').last();
  await expect(lastControl).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await dialog.locator('a[href="#/incidents"]').click();
  await expect(page).toHaveURL((url) => url.hash === "#/incidents");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("main").getByRole("searchbox", { name: "Search incidents", exact: true })).toBeVisible();
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    wideElements: Array.from(document.querySelectorAll("body *")).filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 12).map((element) => ({
      tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right,
    })),
  }));
  expect(layout.overflow, JSON.stringify(layout.wideElements)).toBeLessThanOrEqual(1);
});

test("unknown routes and HTML-like search remain safe and recoverable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const nav = page.getByRole("complementary", { name: "Workspace navigation", exact: true });
  for (const route of ["/unknown-workspace", "/%E0%A4%A"]) {
    await openDemo(page, route);
    await nav.locator('a[href="#/overview"]').last().click();
    await expect(page).toHaveURL((url) => url.hash === "#/overview");
    await expect(page.locator("#current-area")).toHaveText("Overview");
  }
  const payload = `<img id="demo-injection-probe" src="missing" onerror="document.body.dataset.demoInjected='yes'">`;
  const search = nav.getByRole("searchbox", { name: "Find a workspace", exact: true });
  await search.fill(payload);
  await expect(search).toHaveValue(payload);
  await expect(page.locator("#demo-injection-probe")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveAttribute("data-demo-injected", "yes");
  await search.fill("");
  await nav.locator('a[href="#/incidents"]').click();
  await expect(page).toHaveURL((url) => url.hash === "#/incidents");
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [route, heading] of [
  ["/case", "The guard is installed. Is the action ready to close?"],
  ["/overview", "See what needs your attention."],
  ["/incidents", "Every report has a next step."],
  ["/incidents/INC-1042", incidentTitle],
  ["/actions/CAPA-021", actionTitle],
] as const) {
  test(`mobile layout contains page width: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openDemo(page, route);
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveText(heading);
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      wideElements: Array.from(document.querySelectorAll("body *")).filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 12).map((element) => ({
        tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right,
      })),
    }));
    expect(layout.overflow, JSON.stringify(layout.wideElements)).toBeLessThanOrEqual(1);
  });
}

for (const route of ["/case", "/technical", "/overview", "/incidents", "/incidents/INC-1042", "/actions/CAPA-021", "/reports"]) {
  test(`WCAG 2.2 AA automated checks: ${route}`, async ({ page }) => {
    await openDemo(page, route);
    // Evaluate final painted colors, not the brief entrance animation's intermediate opacity.
    await page.evaluate(async () => {
      await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
    });
    const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
    expect(results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => ({ selector: node.target, reason: node.failureSummary })),
    }))).toEqual([]);
  });
}

test("the default case compares evidence and changes the business decision with review volume", async ({ page }) => {
  await page.goto("./");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toContainText("The guard is installed");
  await expect(main.getByRole("heading", { name: "Who should receive the packet next?" })).toBeVisible();
  await main.getByLabel("Evidence available to Alex Morgan").selectOption("observation");
  await main.getByRole("button", { name: "Send to Alex Morgan" }).click();
  await expect(main.locator("#case-outcome")).toContainText("Alex receives both records for closure review");
  const result = main.getByRole("status");
  await expect(result).toContainText("The console costs $1,400 more");
  const volume = main.getByLabel("Actions reviewed per year");
  await volume.fill("1200");
  await expect(result).toContainText("The console costs $1,600 less");
  await volume.fill("");
  await expect(result).toContainText("Complete each assumption");
  await main.getByRole("link", { name: "Inspect CAPA-021" }).click();
  await expect(main.getByRole("heading", { level: 1 })).toHaveText(actionTitle);
  await expect(main).toContainText("Ready for verification");
  await page.goBack();
  await expect(main.getByLabel("Evidence available to Alex Morgan")).toHaveValue("observation");
  await expect(volume).toHaveValue("");
});

for (const [width, height] of [[1440, 900], [390, 844]] as const) {
  test(`the shift handoff exposes the records and evidence choice at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("./");
    const register = page.locator(".handoff-register");
    await expect(register).toContainText("Closure reviewerAlex Morgan");
    await expect(register.getByRole("link", { name: "Inspect CAPA-021" })).toBeInViewport();
    await expect(page.getByLabel("Evidence available to Alex Morgan")).toBeInViewport({ ratio: 1 });
    await expect(page.locator("#case-decision")).toBeInViewport({ ratio: 1 });
  });
}


test("the case has its own entry, dynamic figures and return path from the technical workspace", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator("#project-overview")).toBeHidden();
  await expect(page.getByRole("img", { name: /conveyor sections/ })).toBeVisible();
  const trace = page.locator("#case-operator-trace");
  await expect(trace).toContainText("Evening operator · 20:40");
  await page.locator("#case-packet").selectOption("observation");
  await expect(trace).toHaveText("Day operator · 08:10.");
  const bar = page.locator(".cost-track i").nth(1);
  const before = await bar.getAttribute("style");
  await page.getByLabel("Minutes per action, tracker").fill("12");
  await expect(bar).not.toHaveAttribute("style", before!);
  await expect(page.locator(".cost-graphic")).toContainText("$6,600");
  await page.getByRole("link", { name: "Technical workspace", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Verify the conveyor case" })).toBeVisible();
  await expect(page.locator(".sidebar")).toBeHidden();
  await page.getByText("How are the costs calculated?").click();
  await expect(page.getByRole("main")).toContainText("$11,000");
  await page.getByRole("link", { name: "Open full corporate workspace" }).click();
  await expect(page).toHaveURL(/#\/overview$/);
  await expect(page.locator(".sidebar")).toBeVisible();
  await page.locator(".sidebar").getByRole("link", { name: "Conveyor 3 case" }).click();
  await expect(page.getByRole("heading", { name: "Evidence at handoff" })).toBeVisible();
});


test("the coordinator can exercise all six modeled handoffs and replay without closing the record", async ({ page }) => {
  await page.goto("./");
  const packet = page.locator("#case-packet");
  const outcome = page.locator("#case-outcome");
  for (const [selection, button, consequence] of [
    ["installation", "Return for evidence", "Shift supervisor receives the evidence request"],
    ["installation", "Send to Alex Morgan", "Alex returns the incomplete packet"],
    ["observation", "Return for evidence", "The shift team receives a second follow-up"],
    ["observation", "Send to Alex Morgan", "Alex receives both records for closure review"],
    ["evening", "Return for evidence", "Maya receives both shift accounts for follow-up"],
    ["evening", "Send to Alex Morgan", "Alex holds closure review and returns both notes"],
  ] as const) {
    await packet.selectOption(selection);
    await page.getByRole("button", { name: button }).click();
    await expect(outcome).toContainText(consequence);
    await expect(outcome).toContainText("CAPA-021 stays “Ready for verification”");
  }
  await page.getByRole("button", { name: "Replay the handoff" }).click();
  await expect(packet).toHaveValue("evening");
  await expect(packet).toBeFocused();
  await expect(outcome).toContainText("choose the packet’s next stop");
  await page.getByRole("link", { name: "Inspect CAPA-021" }).click();
  await expect(page.getByRole("main")).toContainText("Ready for verification");
});

test("the dated field notes precede interpretation of the evening packet", async ({ page }) => {
  await page.goto("./");
  const notes = page.locator("#case-excerpt");
  const outcome = page.locator("#case-outcome");
  await expect(notes.locator("dt")).toHaveCount(3);
  await expect(notes).toContainText("guard was in position");
  await expect(notes).toContainText("same guard sitting out of position");
  await expect(outcome).not.toContainText(/discrepancy|holds closure|different accounts/);
  await expect(page.locator("#case-packet option:checked")).toHaveText("Packet through 14 November, 20:40");
  await page.getByRole("button", { name: "Send to Alex Morgan" }).click();
  await expect(outcome).toContainText("day note cannot establish the guard’s condition at 20:40");
  await page.locator("#case-packet").selectOption("observation");
  await expect(notes.locator("dt")).toHaveCount(2);
  await expect(notes).not.toContainText("Evening operator");
  await expect(outcome).not.toContainText("discrepancy");
  await page.getByRole("button", { name: "Send to Alex Morgan" }).click();
  await expect(outcome).toContainText("One run supports that time window");
});
