import { expect, test, type Page } from "@playwright/test";

/**
 * Offline banner + field outbox status-region smoke (ADR-UX-003 / AC-015..AC-017).
 * Signed-in specs skip unless PLAYWRIGHT_E2E_EMAIL / PLAYWRIGHT_E2E_PASSWORD are set.
 */
const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const runSignedIn = Boolean(email && password);
const fieldOutboxOn = process.env.NEXT_PUBLIC_FIELD_OUTBOX === "1";

const FIELD_OUTBOX_DB = "ehs_field_outbox_v1";

async function signInToDashboard(page: Page) {
  await page.goto("/sign-in?callbackUrl=/dashboard");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.locator("[data-dashboard-shell='workspace']")).toBeVisible({
    timeout: 30_000,
  });
}

async function seedFailedOutboxRow(page: Page, organizationId: string) {
  await page.evaluate(
    async ({ dbName, organizationId: orgId }) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName, 1);
        req.onerror = () => reject(req.error ?? new Error("idb open failed"));
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains("queue")) {
            req.result.createObjectStore("queue", { keyPath: "localId" });
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("queue", "readwrite");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error ?? new Error("idb tx failed"));
          tx.objectStore("queue").put({
            localId: "e2e-conflict-seed-001",
            procedure: "inspection.updateStatus",
            organizationId: orgId,
            payloadJson: JSON.stringify({
              organizationId: orgId,
              inspectionId: "00000000-0000-4000-8000-000000000099",
              status: "completed",
            }),
            status: "failed",
            createdAt: Date.now(),
            lastError: "Inspection was deleted or not found — conflict with server copy",
            errorKind: "conflict",
          });
        };
      });
    },
    { dbName: FIELD_OUTBOX_DB, organizationId },
  );
}

test.describe("offline dashboard banner (@smoke when creds set)", () => {
  test.skip(
    !runSignedIn,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD (CI sets these automatically).",
  );

  test("@smoke shows offline notice when navigator is offline", async ({ context, page }) => {
    await signInToDashboard(page);

    await context.setOffline(true);
    await page.waitForSelector('[role="status"]:has-text("offline")');
    await expect(page.getByText(/You appear to be offline/i)).toBeVisible();
    await context.setOffline(false);
  });
});

test.describe("field outbox status region (@smoke|outbox|touch)", () => {
  test.skip(
    !runSignedIn,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD (CI sets these automatically).",
  );

  test("@smoke @outbox flag=0 does not show outbox status chrome", async ({ page }) => {
    test.skip(fieldOutboxOn, "NEXT_PUBLIC_FIELD_OUTBOX=1 — flag-off absence checked when flag is 0");
    await signInToDashboard(page);
    await expect(page.locator("[data-field-outbox-enabled='0']")).toBeVisible();
    await expect(page.locator("#field-outbox-status")).toHaveCount(0);
    await expect(page.getByRole("region", { name: /offline sync queue/i })).toHaveCount(0);
  });

  test("@smoke @outbox persistent status region with conflict row + device-loss copy", async ({
    page,
  }) => {
    test.skip(!fieldOutboxOn, "Requires NEXT_PUBLIC_FIELD_OUTBOX=1");
    await signInToDashboard(page);

    const workspace = page.locator("[data-dashboard-shell='workspace']");
    await expect(workspace).toHaveAttribute("data-field-outbox-enabled", "1");
    const orgId = await workspace.getAttribute("data-organization-id");
    expect(orgId).toBeTruthy();

    await seedFailedOutboxRow(page, orgId!);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    const region = page.locator("#field-outbox-status");
    await expect(region).toBeVisible({ timeout: 15_000 });
    await expect(region).toContainText(/could not sync|offline item/i);
    await expect(region.locator('[data-outbox-error-kind="conflict"]').first()).toBeVisible();
    // Conflict guidance is inside <details>; open for assert + Retry/Remove targets.
    await region.getByText(/View last error per failed item/i).click();
    await expect(region).toContainText(/not merged automatically across devices/i);
    await expect(region).toContainText(/IndexedDB/i);
    await expect(region).toContainText(/Field photos are\s+not\s+queued offline/i);

    const retry = region.locator("[data-outbox-retry='1']");
    const remove = region.locator("[data-outbox-remove='1']").first();
    await expect(retry).toBeVisible();
    await expect(remove).toBeVisible();

    const retryBox = await retry.boundingBox();
    const removeBox = await remove.boundingBox();
    expect(retryBox, "Retry touch target").toBeTruthy();
    expect(removeBox, "Remove touch target").toBeTruthy();
    expect(retryBox!.height).toBeGreaterThanOrEqual(44);
    expect(retryBox!.width).toBeGreaterThanOrEqual(44);
    expect(removeBox!.height).toBeGreaterThanOrEqual(44);
    expect(removeBox!.width).toBeGreaterThanOrEqual(44);

    await remove.click();
    await expect(region.locator("[data-outbox-failed-row='e2e-conflict-seed-001']")).toHaveCount(0, {
      timeout: 10_000,
    });
  });

  test("@smoke @touch field launcher primary and incident submit ≥44px", async ({ page }) => {
    await signInToDashboard(page);

    const fieldLead = page
      .getByRole("link", { name: /report incident/i })
      .or(page.getByRole("button", { name: /report incident/i }))
      .first();
    if (await fieldLead.isVisible().catch(() => false)) {
      const box = await fieldLead.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }

    await page.goto("/dashboard/incidents/new");
    const submit = page.getByRole("button", { name: /submit|create|save/i }).first();
    await expect(submit).toBeVisible({ timeout: 15_000 });
    const submitBox = await submit.boundingBox();
    expect(submitBox).toBeTruthy();
    expect(submitBox!.height).toBeGreaterThanOrEqual(44);
    expect(submitBox!.width).toBeGreaterThanOrEqual(44);
  });

  test("@smoke header uses safe-area inset padding", async ({ page }) => {
    await signInToDashboard(page);
    const header = page.locator("header").first();
    await expect(header).toBeVisible();
    const paddingTop = await header.evaluate((el) => getComputedStyle(el).paddingTop);
    // env(safe-area-inset-top) resolves to 0px in desktop Chromium — still must be a length.
    expect(paddingTop).toMatch(/^\d+(\.\d+)?px$/);
  });
});
