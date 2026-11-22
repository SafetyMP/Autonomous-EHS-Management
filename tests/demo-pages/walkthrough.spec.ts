import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function walk(page: Page, shift: "day" | "night", ...stops: string[]) {
  await page.locator(`[data-shift="${shift}"]`).click();
  for (const stop of stops) await page.locator(`[data-stop="${stop}"]`).click();
  await page.getByRole("button", { name: "Walk this route" }).click();
}

async function handover(page: Page, to: string) {
  await page.getByLabel("Next owner and instruction").selectOption(to);
  await page.getByRole("button", { name: "Issue handover" }).click();
  return page.locator("#receipt");
}

for (const width of [1440, 375]) {
  test(`a coordinator can inspect conflicting shifts, compare handovers and restart at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 870 });
    await page.goto("./");
    await expect(page.getByText("Walk the dock.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Issue handover" }),
    ).toBeDisabled();
    await expect(page.getByText(/Returns occupied/)).toHaveCount(0);
    await walk(page, "day", "crossing", "staging");
    await expect(page.locator(".notebook")).toContainText(
      "2 observations · 1 of 2 shifts · 20 field minutes",
    );
    await expect(await handover(page, "review")).toContainText("other shift");
    await walk(page, "night", "crossing");
    await expect(await handover(page, "review")).toContainText(
      "direct field observation at pallet staging",
    );
    await walk(page, "night", "staging", "desk");
    await expect(page.getByText(/Returns occupied/)).toBeVisible();
    await expect(await handover(page, "review")).toContainText(
      "repeat observation after the reported staging obstruction",
    );
    await expect(await handover(page, "staging")).toContainText(
      "night operator’s report is attached",
    );
    await page.getByText("Earlier handovers (3)").click();
    await expect(page.locator(".handover details")).toContainText(
      "other shift",
    );
    await expect(page.locator(".notebook")).toContainText(
      "5 observations · 2 of 2 shifts · 50 field minutes",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Start a fresh round" }).click();
    await expect(page.locator(".entries li")).toHaveCount(0);
    await expect(page.locator("#receipt")).toHaveCount(0);
  });
}

test("route planning respects capacity, avoids double counting and carries the notebook through the technical reference", async ({
  page,
}) => {
  await page.goto("./");
  await page.locator('[data-stop="crossing"]').click();
  await page.locator('[data-stop="staging"]').click();
  await expect(page.locator('[data-stop="desk"]')).toBeDisabled();
  await page.locator('[data-stop="staging"]').click();
  await expect(page.locator('[data-stop="desk"]')).toBeEnabled();
  await page.locator('[data-shift="night"]').click();
  await expect(
    page.getByRole("button", { name: "Walk this route" }),
  ).toBeDisabled();
  await walk(page, "night", "desk");
  await expect(page.locator('[data-stop="desk"]')).toBeDisabled();
  await expect(await handover(page, "field")).toContainText(
    "other operating window",
  );
  await expect(await handover(page, "staging")).toContainText(
    "no direct account",
  );
  await expect(await handover(page, "desk")).toContainText("22:05 record");
  await page.getByRole("link", { name: "Technical reference" }).click();
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  ).toHaveText("Inside the EHS application");
  await expect(page.locator(".tech-chain li")).toHaveCount(3);
  await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
  await page.getByRole("link", { name: "Return to the field round" }).click();
  await expect(page.locator(".notebook")).toContainText("Dispatch radio log");
  await page.reload();
  await expect(page.locator(".entries li")).toHaveCount(0);
});

test("the field round uses only static assets and accepts old record links", async ({
  page,
  baseURL,
}) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  await page.goto("./#/incidents/INC-1042");
  await expect(
    page.getByRole("heading", { name: "Walk the dock." }),
  ).toBeVisible();
  await walk(page, "night", "staging");
  await handover(page, "staging");
  expect(
    urls
      .filter((url) => /^https?:/.test(url))
      .every((url) => url.startsWith(baseURL!)),
  ).toBe(true);
  expect(urls.some((url) => /api\/|trpc/.test(url))).toBe(false);
});

test("skipping to the technical reference preserves its route on reload and old skip bookmarks resolve to the field round", async ({
  page,
}) => {
  await page.goto("./#/technical");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/technical$/);
  await page.reload();
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  ).toHaveText("Inside the EHS application");
  await expect(
    page.getByRole("link", { name: "Technical reference" }),
  ).toHaveAttribute("aria-current", "page");
  await page.goto("./#main");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  ).toHaveText("Walk the dock.");
  await expect(page.getByRole("link", { name: "Field round" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

for (const route of ["field", "technical"]) {
  test(`keyboard and accessibility checks on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("./#/" + route);
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    if (route === "field") await walk(page, "night", "staging");
    else await expect(page.locator("#tech-title")).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}
