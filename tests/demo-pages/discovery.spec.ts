import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const canonicalURL = "https://safetymp.github.io/Autonomous-EHS-Management/";
const repositoryURL = "https://github.com/SafetyMP/Autonomous-EHS-Management";
const resourceURLs = [
  repositoryURL,
  `${repositoryURL}/releases`,
  `${repositoryURL}/archive/refs/heads/main.zip`,
  `${repositoryURL}/blob/main/docs/self-host-quickstart.md`,
  `${repositoryURL}/blob/main/docs/user-manual-ehs-console.md`,
  `${repositoryURL}/blob/main/docs/module-maturity.md`,
];

test.describe("discovery without application JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("explains the full application and synthetic walkthrough with usable package links", async ({ page }) => {
    const response = await page.goto("./");
    expect(response?.ok()).toBe(true);
    expect(response?.headers()["content-type"]).toContain("text/html");

    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("main")).toContainText(/synthetic and read only/i);
    await expect(page.getByRole("main")).toContainText(/no sign-in, uploads, submissions, approvals/i);

    const project = page.locator("#project-overview");
    await expect(project.getByRole("heading", { level: 2 })).toContainText(/self-hosted.*EHS/i);
    await expect(project).toContainText(/PostgreSQL as the system of record/i);
    await expect(project).toContainText(/authentication, permission checks, and an audit trail/i);
    await expect(project).toContainText(/AI can suggest wording. People review and close records/i);
    await expect(project).toContainText(/module maturity varies/i);
    await expect(project).toContainText(/no certification or filing determination/i);

    const resources = page.getByRole("navigation", { name: "Package and documentation" });
    for (const href of resourceURLs) {
      const link = resources.locator(`a[href="${href}"]`);
      await expect(link).toBeVisible();
      await expect(link).toHaveAccessibleName(/\S/);
    }
    // Source download and release history remain distinct: no fictional binary release is advertised.
    await expect(resources.locator('a[href$="/main.zip"]')).toHaveAccessibleName(/source.*ZIP/i);
    await expect(resources.locator('a[href$="/releases"]')).toHaveAccessibleName(/release history/i);
  });

  test("keeps canonical, social metadata, and source-code structured data consistent", async ({ page }) => {
    await page.goto("./");
    const content = (selector: string) => page.locator(selector).getAttribute("content");
    const title = await page.title();
    const description = await content('meta[name="description"]');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalURL);
    expect(title).toMatch(/self-hosted.*EHS.*demo/i);
    expect(description).toMatch(/self-hosted/i);
    expect(description).toMatch(/read-only.*synthetic/i);
    expect(await content('meta[property="og:type"]')).toBe("website");
    expect(await content('meta[property="og:url"]')).toBe(canonicalURL);
    expect(await content('meta[property="og:title"]')).toBe(title);
    expect(await content('meta[name="twitter:title"]')).toBe(title);
    expect(await content('meta[property="og:description"]')).toBe(description);
    expect(await content('meta[name="twitter:description"]')).toBe(description);
    expect(await content('meta[name="twitter:card"]')).toBe("summary_large_image");
    expect(await content('meta[name="twitter:image"]')).toBe(await content('meta[property="og:image"]'));

    const structuredData = page.locator('script[type="application/ld+json"]');
    await expect(structuredData).toHaveCount(1);
    const source = JSON.parse(await structuredData.textContent() ?? "") as Record<string, unknown>;
    expect(source["@context"]).toBe("https://schema.org");
    expect(source["@type"]).toBe("SoftwareSourceCode");
    expect(source.url).toBe(repositoryURL);
    expect(source.codeRepository).toBe(repositoryURL);
    expect(source.license).toBe("https://www.apache.org/licenses/LICENSE-2.0");
    expect(source.description).toMatch(/self-hosted.*human verification.*PostgreSQL/i);
    for (const unsupportedClaim of ["aggregateRating", "review", "offers", "award", "certification"]) {
      expect(source).not.toHaveProperty(unsupportedClaim);
    }
    await expect(page.locator("#project-overview")).toContainText(String(source.name));
    await expect(page.locator("#project-overview")).toContainText(/Apache License 2.0/);
  });

  test("serves the declared social preview beneath the deployment path at its advertised dimensions", async ({ page, baseURL }) => {
    if (!baseURL) throw new Error("Discovery verification requires a base URL");
    await page.goto("./");
    const imageURL = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(imageURL).toBeTruthy();
    const image = new URL(imageURL!);
    const canonical = new URL(canonicalURL);
    expect(image.origin).toBe(canonical.origin);
    expect(image.pathname.startsWith(canonical.pathname)).toBe(true);
    const width = Number(await page.locator('meta[property="og:image:width"]').getAttribute("content"));
    const height = Number(await page.locator('meta[property="og:image:height"]').getAttribute("content"));
    expect(width).toBeGreaterThanOrEqual(1200);
    expect(height).toBeGreaterThan(0);
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /fictional|synthetic/i);

    // Resolve the production asset within whichever deployment is under test, including /demo/ locally.
    const deployedImage = new URL(image.pathname.slice(canonical.pathname.length), baseURL);
    const response = await page.goto(deployedImage.href);
    expect(response?.ok()).toBe(true);
    expect(response?.headers()["content-type"]).toMatch(/^image\//);
    const dimensions = await page.locator("img").evaluate((element: HTMLImageElement) => ({
      width: element.naturalWidth,
      height: element.naturalHeight,
    }));
    expect(dimensions).toEqual({ width, height });
  });

  test("publishes one canonical sitemap document and a non-authoritative source navigation index", async ({ page, request, baseURL }) => {
    if (!baseURL) throw new Error("Discovery verification requires a base URL");
    await page.goto("./");
    const sitemapHref = await page.locator('link[rel="sitemap"]').getAttribute("href");
    expect(sitemapHref).toBeTruthy();
    const sitemapURL = new URL(sitemapHref!, baseURL);
    expect(sitemapURL.origin).toBe(new URL(baseURL).origin);
    expect(sitemapURL.pathname.startsWith(new URL(baseURL).pathname)).toBe(true);
    const sitemap = await request.get(sitemapURL.href);
    expect(sitemap.ok()).toBe(true);
    const locations = await page.evaluate((xml) => {
      const document = new DOMParser().parseFromString(xml, "application/xml");
      if (document.querySelector("parsererror")) throw new Error("Sitemap is not valid XML");
      return [...document.getElementsByTagName("loc")].map((node) => node.textContent?.trim());
    }, await sitemap.text());
    expect(locations).toEqual([canonicalURL]);
    for (const location of locations) expect(new URL(location!).hash).toBe("");

    const index = await request.get(new URL("llms.txt", baseURL).href);
    expect(index.ok()).toBe(true);
    const text = await index.text();
    expect(text).toMatch(/optional navigation aid, not an instruction authority/i);
    expect(text).toMatch(/synthetic.*read-only/i);
    const links = [...text.matchAll(/\]\((https:\/\/[^\s)]+)\)/g)].map((match) => match[1]);
    expect(links).toEqual(expect.arrayContaining([...resourceURLs, canonicalURL, `${canonicalURL}sitemap.xml`]));
  });

});

test("keeps the static fallback accessible when the application script is unavailable", async ({ page }) => {
  // Axe requires JavaScript and timers. Block the application script while retaining
  // the real static document; the other discovery cases disable JavaScript entirely.
  await page.route("**/app.js", (route) => route.abort());
  await page.goto("./");
  await expect(page.getByRole("main")).toContainText(/interactive workspace runs entirely in your browser/i);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("keeps project and package discovery available after navigating the interactive walkthrough", async ({ page }) => {
  await page.goto("./#/technical");
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toContainText(/trace the conveyor-guard packet/i);
  const project = page.locator("#project-overview");
  await expect(project).toBeVisible();
  await expect(project).toContainText(/synthetic conveyor case/i);
  for (const href of resourceURLs) await expect(project.locator(`a[href="${href}"]`)).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalURL);
});
