import { expect, test, type Page } from "@playwright/test";

/**
 * Calm Focus touch + outbox landmark + safe-area (ADR-UX-007 / AC-CF-A004 / A005 / A006).
 * Extends smoke outbox touch patterns after Calm Focus CSS; tagged @smoke @touch.
 */
const email = process.env.PLAYWRIGHT_E2E_EMAIL;
const password = process.env.PLAYWRIGHT_E2E_PASSWORD;
const runSignedIn = Boolean(email && password);
const fieldOutboxOn = process.env.NEXT_PUBLIC_FIELD_OUTBOX === "1";

const FIELD_OUTBOX_DB = "ehs_field_outbox_v1";

async function signInToDashboard(page: Page, callback = "/dashboard?view=field") {
  await page.goto(`/sign-in?callbackUrl=${encodeURIComponent(callback)}`);
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
            localId: "e2e-cf-touch-seed-001",
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

function assertMinTouch(box: { width: number; height: number } | null, label: string) {
  expect(box, label).toBeTruthy();
  expect(box!.height, `${label} height`).toBeGreaterThanOrEqual(44);
  expect(box!.width, `${label} width`).toBeGreaterThanOrEqual(44);
}

test.describe("Calm Focus touch / outbox / safe-area (@smoke|touch)", () => {
  test.skip(
    !runSignedIn,
    "Set PLAYWRIGHT_E2E_EMAIL and PLAYWRIGHT_E2E_PASSWORD (CI sets these automatically).",
  );

  test("@smoke @touch field primary actions ≥44×44 after Calm Focus CSS", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInToDashboard(page, "/dashboard?view=field");

    const fieldLead = page
      .getByRole("link", { name: /report incident|log observation|start inspection|new permit/i })
      .first();
    await expect(fieldLead).toBeVisible({ timeout: 15_000 });
    assertMinTouch(await fieldLead.boundingBox(), "field primary CTA");

    await page.goto("/dashboard/incidents/new");
    const submit = page.getByRole("button", { name: /submit|create|save/i }).first();
    await expect(submit).toBeVisible({ timeout: 15_000 });
    assertMinTouch(await submit.boundingBox(), "incident submit");
  });

  test("@smoke @touch @outbox status region not suppressed; controls ≥44×44", async ({ page }) => {
    test.skip(!fieldOutboxOn, "Requires NEXT_PUBLIC_FIELD_OUTBOX=1");
    await signInToDashboard(page, "/dashboard?view=field");

    const workspace = page.locator("[data-dashboard-shell='workspace']");
    await expect(workspace).toHaveAttribute("data-field-outbox-enabled", "1");
    const orgId = await workspace.getAttribute("data-organization-id");
    expect(orgId).toBeTruthy();

    await seedFailedOutboxRow(page, orgId!);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    const region = page.locator("#field-outbox-status");
    await expect(region).toBeVisible({ timeout: 15_000 });
    const display = await region.evaluate((el) => getComputedStyle(el).display);
    const visibility = await region.evaluate((el) => getComputedStyle(el).visibility);
    expect(display, "#field-outbox-status display").not.toBe("none");
    expect(visibility, "#field-outbox-status visibility").not.toBe("hidden");
    await expect(page.getByRole("region", { name: /offline sync queue/i })).toBeVisible();

    await region.getByText(/View last error per failed item/i).click();
    const retry = region.locator("[data-outbox-retry='1']");
    const remove = region.locator("[data-outbox-remove='1']").first();
    await expect(retry).toBeVisible();
    await expect(remove).toBeVisible();
    assertMinTouch(await retry.boundingBox(), "outbox Retry");
    assertMinTouch(await remove.boundingBox(), "outbox Remove");
  });

  test("@smoke @touch header safe-area inset padding unchanged", async ({ page }) => {
    await signInToDashboard(page, "/dashboard?view=desk");
    const header = page.locator("header").first();
    await expect(header).toBeVisible();
    const paddingTop = await header.evaluate((el) => getComputedStyle(el).paddingTop);
    expect(paddingTop).toMatch(/^\d+(\.\d+)?px$/);

    const viewportFit = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute("content") ?? "";
    });
    expect(viewportFit.toLowerCase()).toMatch(/viewport-fit\s*=\s*cover/);
  });
});
