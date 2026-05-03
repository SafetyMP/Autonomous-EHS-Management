import { expect, test } from "@playwright/test";
import { signInViaEmailPassword } from "../../helpers/e2e-signed-in";

/** Same credential contract as incident intake smoke (CI sets env from ci.yml). */
const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const runAuthFlow = Boolean(email && password);

test.describe("authenticated observation intake", () => {
  test.skip(
    !runAuthFlow,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD (CI sets these automatically).",
  );

  test("@smoke submits minimal observation from new form", async ({ page }) => {
    const targetPath = "/dashboard/observations/new";
    await signInViaEmailPassword(page, { email: email!, password: password! }, targetPath);
    await expect(page.getByRole("heading", { name: "Log observation" })).toBeVisible();

    await page.getByLabel("Summary").fill(`E2E obs ${Date.now()}`);
    await page.getByRole("button", { name: "Save observation" }).click();

    await expect(page).toHaveURL(/\/dashboard\/observations\/[0-9a-f-]{36}/i, {
      timeout: 30_000,
    });
  });

  test("@smoke observation detail shows follow-up SLA controls", async ({ page }) => {
    await signInViaEmailPassword(
      page,
      { email: email!, password: password! },
      "/dashboard/observations/new",
    );
    await page.getByLabel("Summary").fill(`E2E obs SLA ${Date.now()}`);
    await page.getByRole("button", { name: "Save observation" }).click();
    await expect(page).toHaveURL(/\/dashboard\/observations\/[0-9a-f-]{36}/i, { timeout: 30_000 });
    await expect(page.getByText("Follow-up assignee")).toBeVisible();
    await page.getByLabel("Follow-up due").fill("2999-12-31T23:59");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("region", { name: "Follow-up escalation history" })).toBeVisible();
  });
});
